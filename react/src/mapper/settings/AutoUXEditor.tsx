import stableStringify from 'json-stable-stringify'
import React, { ReactNode } from 'react'

import { ExpandButton } from '../../components/ExpandButton'
import { RenderTwiceHidden } from '../../components/RenderTwiceHidden'
import { CheckboxSettingCustom } from '../../components/sidebar'
import { UrbanStatsASTExpression, UrbanStatsASTArg, locationOf } from '../../urban-stats-script/ast'
import { AutoUXMetadata } from '../../urban-stats-script/autoux-metadata'
import { hsvColorExpression, rgbColorExpression } from '../../urban-stats-script/constants/color-utils'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { extendBlockIdKwarg, extendBlockIdObjectProperty, extendBlockIdPositionalArg, extendBlockIdVectorElement } from '../../urban-stats-script/location'
import { parseNoErrorAsCustomNode, parseNoErrorAsExpression, unparse } from '../../urban-stats-script/parser'
import { USSType, USSFunctionArgType, renderType, USSFunctionType, TypeEnvironment } from '../../urban-stats-script/types-values'
import { DefaultMap } from '../../utils/DefaultMap'
import { Property } from '../../utils/Property'
import { assert } from '../../utils/defensive'
import { useMobileLayout } from '../../utils/responsive'

import { CustomEditor } from './CustomEditor'
import { ActionOptions } from './EditMapperPanel'
import { SelectionContext, Selection as ContextSelection } from './SelectionContext'
import { Selector, classifyExpr, getColor, labelPadding } from './Selector'
import { maybeParseExpr, parseExpr, Selection, possibilities, changeBlockId } from './parseExpr'

function createDefaultExpression(type: USSType, blockIdent: string, typeEnvironment: TypeEnvironment): UrbanStatsASTExpression {
    if (type.type === 'number') {
        return { type: 'constant', value: { node: { type: 'number', value: 0 }, location: emptyLocation(blockIdent) } }
    }
    if (type.type === 'string') {
        return { type: 'constant', value: { node: { type: 'string', value: '' }, location: emptyLocation(blockIdent) } }
    }
    for (const [name, tdoc] of typeEnvironment) {
        if (!tdoc.documentation?.isDefault) {
            continue
        }
        if (renderType(tdoc.type) === renderType(type)) {
            return getDefaultVariable({ type: 'variable', name }, typeEnvironment, blockIdent)
        }
        if (tdoc.type.type === 'function' && tdoc.type.returnType.type !== 'inferFromPrimitive' && renderType(tdoc.type.returnType.value) === renderType(type)) {
            return getDefaultFunction({ type: 'function', name }, typeEnvironment, blockIdent)
        }
    }
    if (type.type === 'vector') {
        return {
            type: 'vectorLiteral',
            entireLoc: emptyLocation(blockIdent),
            elements: [],
        }
    }
    return parseNoErrorAsCustomNode('', blockIdent, [type])
}

function ArgumentEditor(props: {
    name: string
    argWDefault: { type: USSFunctionArgType, defaultValue?: UrbanStatsASTExpression }
    uss: UrbanStatsASTExpression & { type: 'call', fn: UrbanStatsASTExpression & { type: 'identifier' } }
    setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void
    typeEnvironment: TypeEnvironment
    errors: EditorError[]
    blockIdent: string
    collapsed: boolean | undefined
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
    const collapsable = hasDefault && isEnabled && (tdoc?.type.namedArgs[props.name]?.documentation?.collapsable ?? false)
    const collapsed = collapsable && argValue.type === 'named' && (props.collapsed ?? false)

    return (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '0.25em', width: '100%', margin: '0.25em 0' }}>
            {collapsable && (
                <ExpandButton
                    pointing="right"
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
                            { ...functionUss, args: functionUss.args.map(a => a.type === 'named' && a.name.node === props.name ? { ...a, collapsed: !collapsed } : a) },
                            {
                                undoable: false,
                                updateMap: false,
                            },
                        )
                    }}
                />
            )}
            <div style={{ flex: 1 }}>
                <div>
                    {hasDefault
                        ? (
                                <CheckboxSettingCustom
                                    name={humanReadableName}
                                    checked={isEnabled}
                                    onChange={(checked) => {
                                        if (checked) {
                                            const defaultExpr = props.argWDefault.defaultValue
                                            let exprToUse = defaultExpr === undefined || (defaultExpr.type === 'identifier' && defaultExpr.name.node === 'null')
                                                ? createDefaultExpression(arg.value, subident, props.typeEnvironment)
                                                : defaultExpr
                                            exprToUse = deconstruct(exprToUse, props.typeEnvironment, subident, arg.value) ?? parseExpr(exprToUse, subident, [arg.value], props.typeEnvironment, () => {
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

                </div>
                {
                    isEnabled && (
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
                                                        position: 'absolute',
                                                    }
                                                : {
                                                        maxHeight: collapsed ? 0 : renderArg.height,
                                                        transition: 'max-height 0.25s',
                                                        overflowY: collapsed ? 'clip' : undefined,
                                                    }),
                                        }}
                                        ref={renderArg.kind === 'hidden' ? renderArg.ref : undefined}
                                    >
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
                                        />
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
                }
            </div>
        </div>
    )
}

const nullSelectionContext = new Property<ContextSelection | undefined>(undefined)

export function AutoUXEditor(props: {
    uss: UrbanStatsASTExpression
    setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void
    typeEnvironment: TypeEnvironment
    errors: EditorError[]
    blockIdent: string
    type: USSType[]
    label?: string
    labelWidth?: string
    metadata?: AutoUXMetadata
}): ReactNode {
    const ussLoc = locationOf(props.uss).start
    if (ussLoc.block.type !== 'single' || ussLoc.block.ident !== props.blockIdent) {
        console.warn('USS: ', props.uss)
        console.warn('USS Location: ', ussLoc)
        console.warn('Editor blockIdent: ', props.blockIdent)
        console.error('[failtest] USS expression location does not match block identifier', props.uss, ussLoc.block.type === 'single' ? ussLoc.block.ident : '(multi)', props.blockIdent)
    }
    const labelWidth = props.labelWidth ?? '5%'
    const subcomponent = (): [ReactNode | undefined, 'consumes-errors' | 'does-not-consume-errors'] => {
        const uss = props.uss
        if (uss.type === 'constant') {
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
                            collapsed={props.metadata?.collapsed}
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
            if (props.type[0].type === 'vector') {
                // something of a hack, but this really shouldn't be an issue because we don't support multiple types for vectors
                elementType = props.type[0].elementType as USSType
            }
            const element = (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em', width: '100%' }}>
                    {uss.elements.map((el, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%' }}>
                            <AutoUXEditor
                                uss={el}
                                setUss={(newEl, options) => {
                                    const newElements = [...uss.elements]
                                    newElements[i] = newEl
                                    props.setUss({ ...uss, elements: newElements }, options)
                                }}
                                typeEnvironment={props.typeEnvironment}
                                errors={props.errors}
                                blockIdent={extendBlockIdVectorElement(props.blockIdent, i)}
                                type={[elementType]}
                                label={`${i + 1}`}
                            />
                            <button
                                style={{ flexShrink: 0 }}
                                onClick={() => {
                                    const newElements = uss.elements.filter((_, j) => j !== i)
                                    props.setUss({ ...uss, elements: newElements }, {})
                                }}
                                title="Remove element"
                            >
                                –
                            </button>
                        </div>
                    ))}
                    <button
                        data-test-id="test-add-vector-element-button"
                        style={{ alignSelf: 'flex-start', marginTop: 4 }}
                        onClick={() => {
                            const subIdentPrev = extendBlockIdVectorElement(props.blockIdent, uss.elements.length - 1)
                            const subIdent = extendBlockIdVectorElement(props.blockIdent, uss.elements.length)
                            const newElements = [
                                ...uss.elements,
                                // Copy the last element if there is one
                                uss.elements.length > 0
                                    ? changeBlockId(uss.elements[uss.elements.length - 1], subIdentPrev, subIdent)
                                    : createDefaultExpression(elementType, subIdent, props.typeEnvironment),
                            ]
                            props.setUss({ ...uss, elements: newElements }, {})
                        }}
                    >
                        + Add element
                    </button>
                </div>
            )
            return [element, 'does-not-consume-errors']
        }
        if (uss.type === 'objectLiteral') {
            // Determine the element type
            let propertiesTypes: Map<string, USSType> = new DefaultMap(() => ({ type: 'number' })) // fallback
            if (props.type[0].type === 'object') {
                // something of a hack, but this really shouldn't be an issue because we don't support multiple types for objects
                propertiesTypes = props.type[0].properties
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
                            props.setUss(defaultForSelection(selection, props.uss, props.typeEnvironment, props.blockIdent, props.type[0]), {})
                        }}
                        setUss={props.setUss}
                        typeEnvironment={props.typeEnvironment}
                        type={props.type}
                        blockIdent={props.blockIdent}
                        errors={doesConsume === 'consumes-errors' ? [] : props.errors}
                    />
                </div>

            )

    const twoLines = useMobileLayout() || (props.label?.length ?? 0) > 5

    const component = (): ReactNode => {
        if (twoLines) {
            return (
                <>
                    <div style={{ display: 'flex', alignItems: 'top' }}>
                        {leftSegment}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'top' }}>
                        <div style={{ width: labelWidth }} />
                        {rightSegment}
                    </div>
                </>
            )
        }
        else {
            return (
                <div style={{ display: 'flex', alignItems: 'top' }}>
                    <div style={{ width: labelWidth }}>
                        {leftSegment}
                    </div>
                    {rightSegment}
                </div>
            )
        }
    }

    if (props.uss.type === 'autoUX') {
        const uss = props.uss
        return (
            <AutoUXEditor
                {...props}
                uss={uss.expr}
                setUss={(newUss, o) => {
                    if (newUss.type === 'autoUX') {
                        props.setUss(newUss, o)
                    }
                    else {
                        props.setUss({
                            ...uss,
                            expr: newUss,
                        }, o)
                    }
                }}
                metadata={uss.metadata}
            />
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, margin: '0.25em 0', gap: '0.25em' }} id={`auto-ux-editor-${props.blockIdent}`}>
            {leftSegment !== undefined || rightSegment !== undefined ? <div style={{ width: '100%', flex: 1 }}>{component()}</div> : undefined}
            {wrapped}
        </div>
    )
}

function getDefaultVariable(selection: Selection & { type: 'variable' }, typeEnvironment: TypeEnvironment, blockIdent: string): UrbanStatsASTExpression {
    const varType = typeEnvironment.get(selection.name)?.type
    assert(varType !== undefined, `Variable ${selection.name} not found in type environment`)
    return { type: 'identifier', name: { node: selection.name, location: emptyLocation(blockIdent) } }
}

// Returns a function that pulls named or unnamed arguments of the same type and position out of the passed `expr`
// Returns undefined if incompatible
// We're assuming the result will have the correct idnet, since we're using the same position, and it's hard to check
function extractCompatiblePreviousArgs(expr: UrbanStatsASTExpression, typeEnvironment: TypeEnvironment): {
    unnamed: (arg: number, type: USSType) => UrbanStatsASTArg & { type: 'unnamed' } | undefined
    named: (arg: string, type: USSType) => UrbanStatsASTArg & { type: 'named' } | undefined
} {
    let type
    if (expr.type === 'call' && expr.fn.type === 'identifier' && (type = typeEnvironment.get(expr.fn.name.node)) && type.type.type === 'function') {
        const foundType: USSFunctionType = type.type
        return {
            unnamed: (arg, targetType) => {
                if (arg < foundType.posArgs.length && foundType.posArgs[arg].type === 'concrete' && renderType(targetType) === renderType(foundType.posArgs[arg].value)) {
                    return expr.args.filter(a => a.type === 'unnamed')[arg]
                }
                return undefined
            },
            named: (arg, targetType) => {
                if (arg in foundType.namedArgs && foundType.namedArgs[arg].type.type === 'concrete' && renderType(targetType) === renderType(foundType.namedArgs[arg].type.value)) {
                    return expr.args.find((a): a is UrbanStatsASTArg & { type: 'named' } => a.type === 'named' && a.name.node === arg)
                }
                return undefined
            },
        }
    }
    return {
        unnamed: () => undefined,
        named: () => undefined,
    }
}

function getDefaultFunction(selection: Selection & { type: 'function' }, typeEnvironment: TypeEnvironment, blockIdent: string, previous?: UrbanStatsASTExpression): UrbanStatsASTExpression {
    const fn = typeEnvironment.get(selection.name)
    assert(fn !== undefined && fn.type.type === 'function', `Function ${selection.name} not found or not a function`)
    const compatiblePreviousArg = previous ? extractCompatiblePreviousArgs(previous, typeEnvironment) : undefined
    const args: UrbanStatsASTArg[] = []
    // Only include positional arguments by default, not named arguments with defaults, unless there's an existing value for the named argument
    for (let i = 0; i < fn.type.posArgs.length; i++) {
        const arg = fn.type.posArgs[i]
        assert(arg.type === 'concrete', `Positional argument must be concrete`)
        args.push({
            type: 'unnamed',
            value: compatiblePreviousArg?.unnamed(i, arg.value)?.value ?? createDefaultExpression(arg.value, extendBlockIdPositionalArg(blockIdent, i), typeEnvironment),
        })
    }
    for (const [name, argWDefault] of Object.entries(fn.type.namedArgs)) {
        const arg = argWDefault.type
        assert(arg.type === 'concrete', `Named argument ${name} must be concrete`)
        const prev = compatiblePreviousArg?.named(name, arg.value)
        if (prev || argWDefault.defaultValue === undefined) {
            args.push({
                type: 'named',
                name: { node: name, location: emptyLocation(blockIdent) },
                value: prev?.value ?? createDefaultExpression(arg.value, extendBlockIdKwarg(blockIdent, name), typeEnvironment),
            })
        }
    }
    return {
        type: 'call',
        fn: { type: 'identifier', name: { node: selection.name, location: emptyLocation(blockIdent) } },
        args,
        entireLoc: emptyLocation(blockIdent),
    }
}

function deconstruct(expr: UrbanStatsASTExpression, typeEnvironment: TypeEnvironment, blockIdent: string, type: USSType, selection?: Selection): UrbanStatsASTExpression | undefined {
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
                const valid = maybeParseExpr(equiv, blockIdent, type, typeEnvironment)
                if (valid !== undefined && (selection === undefined || stableStringify(classifyExpr(valid)) === stableStringify(selection))) {
                    return valid
                }
            }

            return
        }
        case 'customNode':
            if (expr.expr.type === 'expression') {
                return deconstruct(expr.expr.value, typeEnvironment, blockIdent, type, selection)
            }
            return
        case 'call': {
            if (type.type === 'opaque' && type.name === 'color' && selection?.type === 'function') {
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
    type: USSType,
): UrbanStatsASTExpression {
    const deconstructed = deconstruct(current, typeEnvironment, blockIdent, type, selection)
    if (deconstructed !== undefined) {
        return deconstructed
    }

    const parsed = maybeParseExpr(current, blockIdent, type, typeEnvironment)
    if (parsed !== undefined && stableStringify(classifyExpr(parsed)) === stableStringify(selection)) {
        return parsed
    }

    switch (selection.type) {
        case 'custom':
            return parseNoErrorAsCustomNode(unparse(current, { simplify: true }), blockIdent, [type])
        case 'constant':
            return createDefaultExpression(type, blockIdent, typeEnvironment)
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
            return {
                type: 'objectLiteral',
                entireLoc: emptyLocation(blockIdent),
                properties: [],
            }
    }
}
