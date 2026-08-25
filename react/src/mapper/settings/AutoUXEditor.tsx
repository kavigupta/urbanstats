import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import stableStringify from 'json-stable-stringify'
import React, { ReactNode, useRef } from 'react'

import { ExpandButton } from '../../components/ExpandButton'
import { RenderTwiceHidden } from '../../components/RenderTwiceHidden'
import { CheckboxSettingCustom } from '../../components/checkbox-setting'
import { UrbanStatsASTExpression, locationOf } from '../../urban-stats-script/ast'
import { hsvColorExpression, rgbColorExpression } from '../../urban-stats-script/constants/color-utils'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { extendBlockIdKwarg, extendBlockIdObjectProperty, extendBlockIdPositionalArg, extendBlockIdVectorElement, noLocation } from '../../urban-stats-script/location'
import { parseNoErrorAsCustomNode, parseNoErrorAsExpression, unparse } from '../../urban-stats-script/parser'
import { USSType, USSFunctionArgType, TypeEnvironment } from '../../urban-stats-script/types-values'
import { AssignmentsResult } from '../../urban-stats-script/workerManager'
import { DefaultMap } from '../../utils/DefaultMap'
import { Property } from '../../utils/Property'
import { assert } from '../../utils/defensive'
import { randomBase62ID } from '../../utils/random'
import { useMobileLayout } from '../../utils/responsive'

import * as ArgEditButtons from './ArgEditButtons'
import { CustomEditor } from './CustomEditor'
import { ActionOptions } from './EditMapperPanel'
import { SelectionContext, Selection as ContextSelection } from './SelectionContext'
import { Selector, getColor, labelPadding } from './Selector'
import { createDefaultExpression, getDefaultFunction, getDefaultVariable, maybeParseExpr, parseExpr, possibilities, changeBlockId } from './parseExpr'
import { classifyExpr, maybeClassifyExpr, Selection } from './selector-classifier'

function ArgumentEditor(props: {
    name: string
    argWDefault: { type: USSFunctionArgType, defaultValue?: UrbanStatsASTExpression }
    uss: UrbanStatsASTExpression & { type: 'call', fn: UrbanStatsASTExpression & { type: 'identifier' } }
    setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void
    typeEnvironment: TypeEnvironment
    errors: EditorError[]
    blockIdent: string
    assignments: AssignmentsResult
}): ReactNode {
    const arg = props.argWDefault.type
    assert(arg.type === 'concrete', `Named argument ${props.name} must be concrete`)

    const functionUss = props.uss
    const argValue = functionUss.args.find(a => a.type === 'named' && a.name.node === props.name)
    const hasDefault = props.argWDefault.defaultValue !== undefined
    const isEnabled = argValue !== undefined
    const subident = extendBlockIdKwarg(props.blockIdent, props.name)

    // Get the function's documentation to find human-readable argument names
    const tdoc = props.typeEnvironment.get(functionUss.fn.name.node)
    const humanReadableName = tdoc?.documentation?.namedArgs?.[props.name] ?? props.name
    assert(tdoc?.type === undefined || tdoc.type.type === 'function', `AutoUX looked up function identifier ${functionUss.fn.name.node}m, but it was not a function`)
    const argDoc = tdoc?.type.namedArgs[props.name]?.documentation
    const collapsable = hasDefault && isEnabled && (argDoc?.collapsable ?? false)
    const collapsed = collapsable && argValue.type === 'named' && argValue.value.type === 'autoUXNode' && argValue.value.metadata.collapsed === true
    // eslint-disable-next-line no-restricted-syntax -- Must be capital for JSX
    const EditButton = argDoc?.editButton && ArgEditButtons[argDoc.editButton]

    const editor = isEnabled && (
        <AutoUXEditor
            uss={argValue.value}
            setUss={(newUss, actionKind) => {
                const newArgs = functionUss.args.map(a => a.type === 'named' && a.name.node === props.name ? { ...a, value: newUss } : a)
                props.setUss({ ...functionUss, args: newArgs }, actionKind)
            }}
            typeEnvironment={props.typeEnvironment}
            errors={props.errors}
            blockIdent={subident}
            type={[arg.value]}
            margin={!collapsed}
            assignments={props.assignments}
        />
    )

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '0.25em', width: '100%', margin: '0.25em 0' }}>
            {collapsable && (
                <ExpandButton
                    data-test="expand-button"
                    data-test-name={props.name}
                    data-test-state={!collapsed}
                    isExpanded={!collapsed}
                    style={{
                        position: 'absolute',
                        width: 16,
                        height: 16,
                        left: -14,
                        top: 3,
                    }}
                    onClick={() => {
                        props.setUss(
                            { ...functionUss, args: functionUss.args.map(a =>
                                a.type === 'named' && a.name.node === props.name
                                    ? { ...a, value: a.value.type === 'autoUXNode'
                                            ? { ...a.value, metadata: { ...a.value.metadata, collapsed: !a.value.metadata.collapsed } }
                                            : { type: 'autoUXNode', expr: a.value, entireLoc: locationOf(a.value), metadata: { collapsed: true } } }
                                    : a) },
                            {
                                undoable: false,
                                update: false,
                            },
                        )
                    }}
                />
            )}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {hasDefault
                        ? (
                                <CheckboxSettingCustom
                                    name={humanReadableName}
                                    checked={isEnabled}
                                    onChange={(checked) => {
                                        if (checked) {
                                            const defaultExpr = props.argWDefault.defaultValue
                                            let exprToUse: UrbanStatsASTExpression
                                            if (defaultExpr === undefined || (defaultExpr.type === 'identifier' && defaultExpr.name.node === 'null')) {
                                                exprToUse = createDefaultExpression(arg.value, subident, props.typeEnvironment)
                                            }
                                            else if (defaultExpr.type === 'identifier' && defaultExpr.name.node === 'false') {
                                                exprToUse = {
                                                    type: 'identifier',
                                                    name: {
                                                        node: 'true',
                                                        location: noLocation,
                                                    },
                                                }
                                            }
                                            else {
                                                exprToUse = defaultExpr
                                            }
                                            exprToUse = deconstruct(exprToUse, props.typeEnvironment, subident, [arg.value]) ?? parseExpr(exprToUse, subident, [arg.value], props.typeEnvironment, () => {
                                                throw new Error('Should not happen')
                                            }, true)
                                            // Add the argument with default value
                                            const newArg = {
                                                type: 'named' as const,
                                                name: { node: props.name, location: emptyLocation(subident) },
                                                value: exprToUse,
                                            }
                                            const newArgs = [...functionUss.args, newArg]
                                            props.setUss({ ...functionUss, args: newArgs }, {})
                                        }
                                        else {
                                            // Remove the argument
                                            const newArgs = functionUss.args.filter(a => !(a.type === 'named' && a.name.node === props.name))
                                            props.setUss({ ...functionUss, args: newArgs }, {})
                                        }
                                    }}
                                />
                            )
                        : <span>{humanReadableName}</span>}
                    {EditButton && <EditButton />}
                </div>
                {
                    isEnabled && (collapsable
                        ? (
                                <RenderTwiceHidden<HTMLDivElement>>
                                    {(renderArg) => {
                                        const result = (
                                            <div
                                                // @ts-expect-error -- inert is not in the type definitions yet
                                                inert={renderArg.kind === 'hidden' ? '' : undefined}
                                                style={{
                                                    ...(renderArg.kind === 'hidden'
                                                        ? {
                                                                opacity: 0,
                                                                position: 'fixed',
                                                            }
                                                        : {
                                                                maxHeight: collapsed ? 0 : renderArg.height,
                                                                transition: 'max-height 0.25s',
                                                                overflowY: collapsed ? 'clip' : undefined,
                                                                maxWidth: collapsed ? 0 : undefined,
                                                            }),
                                                }}
                                                ref={renderArg.kind === 'hidden' ? renderArg.ref : undefined}
                                            >
                                                {editor}
                                            </div>
                                        )
                                        if (renderArg.kind === 'hidden') {
                                            return (
                                                <SelectionContext.Provider value={nullSelectionContext}>
                                                    {result}
                                                </SelectionContext.Provider>
                                            )
                                        }
                                        return result
                                    }}

                                </RenderTwiceHidden>
                            )
                        : editor)
                }
            </div>
        </div>
    )
}

const nullSelectionContext = new Property<ContextSelection | undefined>(undefined)

function SortableVectorItem(props: { id: string, children: (dragHandle: ReactNode) => ReactNode }): ReactNode {
    const { attributes, listeners, setNodeRef, transform, isDragging, transition } = useSortable({ id: props.id })
    const dragHandle = (
        <button
            {...attributes}
            {...listeners}
            style={{
                cursor: 'grab',
                background: 'none',
                border: 'none',
                padding: '0 4px',
                touchAction: 'none',
                position: 'absolute',
                right: '100%',
                top: '50%',
                transform: 'translateY(-50%)',
            }}
            title="Drag to reorder"
        >
            ⠿
        </button>
    )
    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                opacity: isDragging ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                transition,
            }}
        >
            {props.children(dragHandle)}
        </div>
    )
}

function VectorLiteralEditor(props: {
    uss: UrbanStatsASTExpression & { type: 'vectorLiteral' }
    setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void
    typeEnvironment: TypeEnvironment
    errors: EditorError[]
    blockIdent: string
    elementType: USSType
    assignments: AssignmentsResult
}): ReactNode {
    /*
     * We need stable identifiers for dnd-kit, but elements don't have unique ids.
     * We generate random IDs and keep them in a ref so they persist across re-renders.
     * These ids don't need to be perfect, they just need to be unique for dragging.
     */
    const ids = useRef<string[]>([])
    while (ids.current.length < props.uss.elements.length) {
        ids.current.push(randomBase62ID(7))
    }
    while (ids.current.length > props.uss.elements.length) {
        ids.current.pop()
    }

    const sensors = useSensors(useSensor(PointerSensor))

    function handleDragEnd(event: DragEndEvent): void {
        const { active, over } = event
        if (over && active.id !== over.id) {
            const oldIndex = ids.current.indexOf(active.id as string)
            const newIndex = ids.current.indexOf(over.id as string)
            const indexedElements = props.uss.elements.map((el, i) => ({ el, oldIndex: i }))
            const reordered = arrayMove(indexedElements, oldIndex, newIndex)
            const newElements = reordered.map(({ el, oldIndex: oi }, newIdx) =>
                changeBlockId(
                    el,
                    extendBlockIdVectorElement(props.blockIdent, oi),
                    extendBlockIdVectorElement(props.blockIdent, newIdx),
                ),
            )
            props.setUss({ ...props.uss, elements: newElements }, {})

            ids.current = arrayMove(ids.current, oldIndex, newIndex)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em', width: '100%' }}>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={ids.current} strategy={verticalListSortingStrategy}>
                    {props.uss.elements.map((el, i) => (
                        <SortableVectorItem key={ids.current[i]} id={ids.current[i]}>
                            {dragHandle => (
                                <AutoUXEditor
                                    uss={el}
                                    setUss={(newEl, options) => {
                                        const newElements = [...props.uss.elements]
                                        newElements[i] = newEl
                                        props.setUss({ ...props.uss, elements: newElements }, options)
                                    }}
                                    typeEnvironment={props.typeEnvironment}
                                    errors={props.errors}
                                    blockIdent={extendBlockIdVectorElement(props.blockIdent, i)}
                                    type={[props.elementType]}
                                    label={`${i + 1}`}
                                    assignments={props.assignments}
                                    dragHandle={dragHandle}
                                    removeButton={(
                                        <button
                                            onClick={() => {
                                                const newElements = props.uss.elements.flatMap((vectorElement, j) => {
                                                    if (j === i) {
                                                        return []
                                                    }
                                                    if (j < i) {
                                                        return [vectorElement]
                                                    }
                                                    return [changeBlockId(
                                                        vectorElement,
                                                        extendBlockIdVectorElement(props.blockIdent, j),
                                                        extendBlockIdVectorElement(props.blockIdent, j - 1),
                                                    )]
                                                })
                                                ids.current.splice(i, 1)
                                                props.setUss({ ...props.uss, elements: newElements }, {})
                                            }}
                                            title="Remove element"
                                        >
                                            –
                                        </button>
                                    )}
                                />
                            )}
                        </SortableVectorItem>
                    ))}
                </SortableContext>
            </DndContext>
            <button
                data-test-id="test-add-vector-element-button"
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                onClick={() => {
                    const subIdentPrev = extendBlockIdVectorElement(props.blockIdent, props.uss.elements.length - 1)
                    const subIdent = extendBlockIdVectorElement(props.blockIdent, props.uss.elements.length)
                    const newElements = [
                        ...props.uss.elements,
                        props.uss.elements.length > 0
                            ? changeBlockId(props.uss.elements[props.uss.elements.length - 1], subIdentPrev, subIdent)
                            : createDefaultExpression(props.elementType, subIdent, props.typeEnvironment),
                    ]
                    props.setUss({ ...props.uss, elements: newElements }, {})
                }}
            >
                + Add element
            </button>
        </div>
    )
}

export function AutoUXEditor(props: {
    uss: UrbanStatsASTExpression
    setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void
    typeEnvironment: TypeEnvironment
    errors: EditorError[]
    blockIdent: string
    type: USSType[]
    label?: string
    labelWidth?: string
    margin?: boolean
    assignments: AssignmentsResult
    // Rendered on the header's line: the handle hangs outside to the left, the button sits to the right
    dragHandle?: ReactNode
    removeButton?: ReactNode
}): ReactNode {
    const ussLoc = locationOf(props.uss).start
    if (ussLoc.block.type !== 'single' || ussLoc.block.ident !== props.blockIdent) {
        console.warn('USS: ', props.uss)
        console.warn('USS Location: ', ussLoc)
        console.warn('Editor blockIdent: ', props.blockIdent)
        console.error('[failtest] USS expression location does not match block identifier', props.uss, ussLoc.block.type === 'single' ? ussLoc.block.ident : '(multi)', props.blockIdent)
    }
    const labelWidth = props.labelWidth ?? '5%'
    const twoLines = useMobileLayout() || (props.label?.length ?? 0) > 5

    if (props.uss.type === 'autoUXNode') {
        const uss = props.uss
        return (
            <AutoUXEditor
                {...props}
                uss={uss.expr}
                setUss={(newUss, o) => {
                    if (newUss.type === 'autoUXNode') {
                        props.setUss(newUss, o)
                    }
                    else {
                        props.setUss({
                            ...uss,
                            expr: newUss,
                        }, o)
                    }
                }}
            />
        )
    }

    const subcomponent = (): [ReactNode | undefined, 'consumes-errors' | 'does-not-consume-errors'] => {
        const uss = props.uss
        if (maybeClassifyExpr(uss)?.type === 'constant') {
            return [undefined, 'does-not-consume-errors']
        }
        if (uss.type === 'customNode') {
            const editor = (
                <CustomEditor
                    key="custom"
                    uss={uss}
                    setUss={props.setUss}
                    typeEnvironment={props.typeEnvironment}
                    errors={props.errors}
                    blockIdent={props.blockIdent}
                    assignments={props.assignments}
                />
            )
            return [editor, 'consumes-errors']
        }
        if (uss.type === 'identifier') {
            return [undefined, 'does-not-consume-errors']
        }
        if (uss.type === 'call') {
            assert(uss.fn.type === 'identifier', 'Function must be an identifier')
            const tdoc = props.typeEnvironment.get(uss.fn.name.node)
            assert(tdoc !== undefined, `Function ${uss.fn.name.node} not found in type environment`)
            const type = tdoc.type
            assert(type.type === 'function', `Function ${uss.fn.name.node} must be a function type`)
            const subselectors: ReactNode[] = []
            type.posArgs.forEach((arg, i) => {
                assert(arg.type === 'concrete', `Positional argument must be concrete`)
                subselectors.push(
                    <AutoUXEditor
                        key={`pos-${i}`}
                        uss={uss.args[i].value}
                        setUss={(newUss, options) => {
                            const newArgs = [...uss.args]
                            newArgs[i] = { ...newArgs[i], value: newUss }
                            props.setUss({ ...uss, args: newArgs }, options)
                        }}
                        typeEnvironment={props.typeEnvironment}
                        errors={props.errors}
                        blockIdent={extendBlockIdPositionalArg(props.blockIdent, i)}
                        type={[arg.value]}
                        assignments={props.assignments}
                    />,
                )
            })
            Object.entries(type.namedArgs).forEach(([name, argWDefault]) => {
                if (argWDefault.documentation?.hide !== true) {
                    subselectors.push(
                        <ArgumentEditor
                            key={`named-${name}`}
                            name={name}
                            argWDefault={argWDefault}
                            // cast is valid because we checked type above
                            uss={uss as UrbanStatsASTExpression & { type: 'function', fn: UrbanStatsASTExpression & { type: 'identifier' } }}
                            setUss={props.setUss}
                            typeEnvironment={props.typeEnvironment}
                            errors={props.errors}
                            blockIdent={props.blockIdent}
                            assignments={props.assignments}
                        />,
                    )
                }
            })
            const element = <div key="subselectors">{...subselectors}</div>
            return [element, 'does-not-consume-errors']
        }
        if (uss.type === 'vectorLiteral') {
            // Determine the element type
            let elementType: USSType = { type: 'number' } // fallback
            const vectorType = props.type.find(t => t.type === 'vector')
            if (vectorType !== undefined) {
                assert(
                    vectorType.elementType.type !== 'elementOfEmptyVector',
                    'the provided type for an autoux editor shouldn\'t be an empty vector',
                )
                // something of a hack, but this really shouldn't be an issue because we don't support multiple types for vectors
                elementType = vectorType.elementType
            }
            const element = (
                <VectorLiteralEditor
                    uss={uss}
                    setUss={props.setUss}
                    typeEnvironment={props.typeEnvironment}
                    errors={props.errors}
                    blockIdent={props.blockIdent}
                    elementType={elementType}
                    assignments={props.assignments}
                />
            )
            return [element, 'does-not-consume-errors']
        }
        if (uss.type === 'objectLiteral') {
            // Determine the element type
            let propertiesTypes: Map<string, USSType> = new DefaultMap(() => ({ type: 'number' })) // fallback
            const objectType = props.type.find(t => t.type === 'object')
            if (objectType !== undefined) {
                // something of a hack, but this really shouldn't be an issue because we don't support multiple types for objects
                propertiesTypes = objectType.properties
            }
            const element = (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em', width: '100%' }}>
                    {Array.from(propertiesTypes.keys()).sort().map((key) => {
                        const propertyType = propertiesTypes.get(key)!
                        return (
                            <AutoUXEditor
                                key={key}
                                uss={uss.properties.find(([k]) => k === key)?.[1] ?? createDefaultExpression(propertyType, extendBlockIdObjectProperty(props.blockIdent, key), props.typeEnvironment)}
                                setUss={(newVal, options) => {
                                    props.setUss({ ...uss, properties: uss.properties.map(([k, v]) => [k, k === key ? newVal : v]) }, options)
                                }}
                                typeEnvironment={props.typeEnvironment}
                                errors={props.errors}
                                blockIdent={extendBlockIdObjectProperty(props.blockIdent, key)}
                                type={[propertyType]}
                                label={key}
                                assignments={props.assignments}
                            />
                        )
                    })}
                </div>
            )
            return [element, 'does-not-consume-errors']
        }
        throw new Error(`Unsupported USS expression type: ${props.uss.type}`) // TODO handle other types
    }

    const wrappedSubcomponent = (): [ReactNode | undefined, 'consumes-errors' | 'does-not-consume-errors'] => {
        const [subc, doesConsume] = subcomponent()
        if (subc === undefined) {
            return [undefined, doesConsume]
        }
        const element = (
            <div style={{ width: '100%', flex: 1 }}>
                <div style={{ display: 'flex', gap: '1em', marginLeft: labelWidth }}>
                    {props.label && <span style={{ minWidth: 'fit-content' }}></span>}
                    <div style={{ flex: 1 }}>
                        {subc}
                    </div>
                </div>
            </div>
        )
        return [element, doesConsume]
    }

    const [wrapped, doesConsume] = wrappedSubcomponent()

    const leftSegment = props.label === undefined
        ? undefined
        : (
                <div style={{ padding: `${labelPadding} 0px`, display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ minWidth: 'fit-content', marginRight: '5px' }}>{props.label}</span>
                </div>
            )
    const rightSegment = possibilities(props.type, props.typeEnvironment).length < 2
        ? undefined
        : (
                <div style={{ width: `calc(100% - ${labelWidth})` }}>
                    <Selector
                        uss={props.uss}
                        setSelection={(selection: Selection) => {
                            props.setUss(defaultForSelection(selection, props.uss, props.typeEnvironment, props.blockIdent, props.type), {})
                        }}
                        setUss={props.setUss}
                        typeEnvironment={props.typeEnvironment}
                        type={props.type}
                        blockIdent={props.blockIdent}
                        errors={doesConsume === 'consumes-errors' ? [] : props.errors}
                    />
                </div>

            )

    const headerLine = (label: ReactNode): ReactNode => (
        <div style={{ display: 'flex', alignItems: 'top' }}>
            <div style={{ width: labelWidth }}>{label}</div>
            {rightSegment}
        </div>
    )

    const hasHeader = leftSegment !== undefined || rightSegment !== undefined
    // On mobile the label goes above the selector rather than beside it, and it is the selector that the row controls line up with
    const labelOnOwnRow = twoLines && leftSegment !== undefined && rightSegment !== undefined
    const headerRow = labelOnOwnRow ? 2 : 1

    return (
        <div
            style={{
                display: 'grid',
                // The remove button sits beside the header, and the body lines up with the header rather than the button
                gridTemplateColumns: props.removeButton === undefined ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) auto',
                columnGap: '0.5em',
                rowGap: '0.25em',
                width: '100%',
                flex: 1,
                minWidth: 0,
                margin: props.margin === false ? 0 : '0.25em 0',
            }}
            id={`auto-ux-editor-${props.blockIdent}`}
        >
            {labelOnOwnRow && (
                <div style={{ gridRow: 1, gridColumn: 1, display: 'flex', alignItems: 'top' }}>
                    {leftSegment}
                </div>
            )}
            {hasHeader && (
                <div style={{ gridRow: headerRow, gridColumn: 1, position: 'relative', width: '100%' }}>
                    {props.dragHandle}
                    {headerLine(labelOnOwnRow ? undefined : leftSegment)}
                </div>
            )}
            {props.removeButton !== undefined && (
                <div style={{ gridRow: headerRow, gridColumn: 2, alignSelf: 'center' }}>
                    {props.removeButton}
                </div>
            )}
            {wrapped !== undefined && <div style={{ gridRow: hasHeader ? headerRow + 1 : 1, gridColumn: 1 }}>{wrapped}</div>}
        </div>
    )
}

function deconstruct(expr: UrbanStatsASTExpression, typeEnvironment: TypeEnvironment, blockIdent: string, types: USSType[], selection?: Selection): UrbanStatsASTExpression | undefined {
    switch (expr.type) {
        case 'identifier': {
            const reference = typeEnvironment.get(expr.name.node)

            if (reference === undefined) {
                return
            }

            if (reference.documentation?.equivalentExpressions === undefined) {
                return
            }

            for (const equiv of reference.documentation.equivalentExpressions) {
                const valid = maybeParseExpr(equiv, blockIdent, types, typeEnvironment)
                if (valid !== undefined && (selection === undefined || stableStringify(classifyExpr(valid)) === stableStringify(selection))) {
                    return valid
                }
            }

            return
        }
        case 'customNode':
            if (expr.expr.type === 'expression') {
                return deconstruct(expr.expr.value, typeEnvironment, blockIdent, types, selection)
            }
            return
        case 'call': {
            if (types.some(t => t.type === 'opaque' && t.name === 'color') && selection?.type === 'function') {
                // Conversion between RGB and HSV functions
                const color = getColor(expr, typeEnvironment)
                switch (true) {
                    case color?.kind === 'rgb' && selection.name === 'hsv':
                        // rgb to hsv
                        return parseNoErrorAsExpression(hsvColorExpression(color.color), blockIdent)
                    case color?.kind === 'hsv' && selection.name === 'rgb':
                        // hsv to rgb
                        return parseNoErrorAsExpression(rgbColorExpression(color.color), blockIdent)
                }
            }
            return
        }
        default:
            return
    }
}

function defaultForSelection(
    selection: Selection,
    current: UrbanStatsASTExpression,
    typeEnvironment: TypeEnvironment,
    blockIdent: string,
    types: USSType[],
): UrbanStatsASTExpression {
    const deconstructed = deconstruct(current, typeEnvironment, blockIdent, types, selection)
    if (deconstructed !== undefined) {
        return deconstructed
    }

    const parsed = maybeParseExpr(current, blockIdent, types, typeEnvironment)
    if (parsed !== undefined && stableStringify(classifyExpr(parsed)) === stableStringify(selection)) {
        return parsed
    }

    switch (selection.type) {
        case 'custom':
            return parseNoErrorAsCustomNode(unparse(current, { simplify: 'auto-ux' }), blockIdent, types)
        case 'constant':
            return createDefaultExpression(types.find(t => t.type === 'number' || t.type === 'string') ?? types[0], blockIdent, typeEnvironment)
        case 'variable':
            return getDefaultVariable(selection as Selection & { type: 'variable' }, typeEnvironment, blockIdent)
        case 'function':
            return getDefaultFunction(selection as Selection & { type: 'function' }, typeEnvironment, blockIdent, current)
        case 'vector': {
            // Create an empty vectorLiteral of the right type
            return {
                type: 'vectorLiteral',
                entireLoc: emptyLocation(blockIdent),
                elements: [],
            }
        }
        case 'object':
            return createDefaultExpression(types.find(t => t.type === 'object') ?? types[0], blockIdent, typeEnvironment)
    }
}
