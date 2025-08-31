import stableStringify from 'json-stable-stringify'
import React, { ReactNode } from 'react'

import { CheckboxSettingCustom } from '../../components/sidebar'
import { UrbanStatsASTExpression, UrbanStatsASTArg, UrbanStatsASTStatement, locationOf, toStatement } from '../../urban-stats-script/ast'
import { hsvColorExpression, rgbColorExpression } from '../../urban-stats-script/constants/color'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { extendBlockIdKwarg, extendBlockIdObjectProperty, extendBlockIdPositionalArg, extendBlockIdVectorElement } from '../../urban-stats-script/location'
import { parseNoErrorAsCustomNode, parseNoErrorAsExpression, unparse } from '../../urban-stats-script/parser'
import { USSDocumentedType, USSType, USSFunctionArgType, renderType, USSObjectType } from '../../urban-stats-script/types-values'
import { DefaultMap } from '../../utils/DefaultMap'
import { assert } from '../../utils/defensive'
import { useMobileLayout } from '../../utils/responsive'

import { CustomEditor } from './CustomEditor'
import { Selector, Selection, classifyExpr, possibilities, getColor, labelPadding } from './Selector'

function createDefaultExpression(type: USSType, blockIdent: string, typeEnvironment: Map<string, USSDocumentedType>): UrbanStatsASTExpression {
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
    setUss: (u: UrbanStatsASTExpression) => void
    typeEnvironment: Map<string, USSDocumentedType>
    errors: EditorError[]
    blockIdent: string
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

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.25em', width: '100%', margin: '0.25em 0' }}>
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
                                            // Add the argument with default value
                                            const newArgs = [...functionUss.args, {
                                                type: 'named' as const,
                                                name: { node: props.name, location: emptyLocation(subident) },
                                                value: defaultExpr === undefined || (defaultExpr.type === 'identifier' && defaultExpr.name.node === 'null')
                                                    ? createDefaultExpression(arg.value, subident, props.typeEnvironment)
                                                    : defaultExpr,
                                            }]
                                            props.setUss({ ...functionUss, args: newArgs })
                                        }
                                        else {
                                            // Remove the argument
                                            const newArgs = functionUss.args.filter(a => !(a.type === 'named' && a.name.node === props.name))
                                            props.setUss({ ...functionUss, args: newArgs })
                                        }
                                    }}
                                />
                            )
                        : <span>{humanReadableName}</span>}

                </div>
                {isEnabled
                && (
                    <AutoUXEditor
                        uss={argValue.value}
                        setUss={(newUss) => {
                            const newArgs = functionUss.args.map(a => a.type === 'named' && a.name.node === props.name ? { ...a, value: newUss } : a)
                            props.setUss({ ...functionUss, args: newArgs })
                        }}
                        typeEnvironment={props.typeEnvironment}
                        errors={props.errors}
                        blockIdent={subident}
                        type={[arg.value]}
                    />
                )}
            </div>
        </div>
    )
}

export function AutoUXEditor(props: {
    uss: UrbanStatsASTExpression
    setUss: (u: UrbanStatsASTExpression) => void
    typeEnvironment: Map<string, USSDocumentedType>
    errors: EditorError[]
    blockIdent: string
    type: USSType[]
    label?: string
    labelWidth?: string
}): ReactNode {
    const ussLoc = locationOf(props.uss).start
    if (ussLoc.block.type !== 'single' || ussLoc.block.ident !== props.blockIdent) {
        console.warn('USS: ', props.uss)
        console.warn('USS Location: ', ussLoc)
        console.warn('Editor blockIdent: ', props.blockIdent)
        console.error('USS expression location does not match block identifier', props.uss, ussLoc, props.blockIdent)
    }
    const labelWidth = props.labelWidth ?? '5%'
    const subcomponent = (): [ReactNode | undefined, 'consumes-errors' | 'does-not-consume-errors'] => {
        if (props.uss.type === 'constant') {
            return [undefined, 'does-not-consume-errors']
        }
        const uss = props.uss
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
                        setUss={(newUss) => {
                            const newArgs = [...uss.args]
                            newArgs[i] = { ...newArgs[i], value: newUss }
                            props.setUss({ ...uss, args: newArgs })
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
                                setUss={(newEl) => {
                                    const newElements = [...uss.elements]
                                    newElements[i] = newEl
                                    props.setUss({ ...uss, elements: newElements })
                                }}
                                typeEnvironment={props.typeEnvironment}
                                errors={props.errors}
                                blockIdent={extendBlockIdVectorElement(props.blockIdent, i)}
                                type={[elementType]}
                                label={`${i + 1}`}
                            />
                            <button
                                style={{ marginLeft: 8, flexShrink: 0 }}
                                onClick={() => {
                                    const newElements = uss.elements.filter((_, j) => j !== i)
                                    props.setUss({ ...uss, elements: newElements })
                                }}
                                title="Remove element"
                            >
                                –
                            </button>
                        </div>
                    ))}
                    <button
                        style={{ alignSelf: 'flex-start', marginTop: 4 }}
                        onClick={() => {
                            const newElements = [
                                ...uss.elements,
                                // Copy the last element if there is one
                                uss.elements.length > 0
                                    ? uss.elements[uss.elements.length - 1]
                                    : createDefaultExpression(elementType, extendBlockIdVectorElement(props.blockIdent, uss.elements.length), props.typeEnvironment),
                            ]
                            props.setUss({ ...uss, elements: newElements })
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
                                setUss={(newVal) => {
                                    props.setUss({ ...uss, properties: uss.properties.map(([k, v]) => [k, k === key ? newVal : v]) })
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
                <div style={{ padding: `${labelPadding} 0px` }}>
                    <span style={{ minWidth: 'fit-content' }}>{props.label}</span>
                </div>
            )
    const rightSegment = possibilities(props.type, props.typeEnvironment).length < 2
        ? undefined
        : (
                <div style={{ width: `calc(100% - ${labelWidth})` }}>
                    <Selector
                        uss={props.uss}
                        setSelection={(selection: Selection) => {
                            props.setUss(defaultForSelection(selection, props.uss, props.typeEnvironment, props.blockIdent, props.type[0]))
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, margin: '0.25em 0', gap: '0.25em' }} id={`auto-ux-editor-${props.blockIdent}`}>
            {leftSegment !== undefined || rightSegment !== undefined ? <div style={{ width: '100%', flex: 1 }}>{component()}</div> : undefined}
            {wrapped}
        </div>
    )
}

function getDefaultVariable(selection: Selection & { type: 'variable' }, typeEnvironment: Map<string, USSDocumentedType>, blockIdent: string): UrbanStatsASTExpression {
    const varType = typeEnvironment.get(selection.name)?.type
    assert(varType !== undefined, `Variable ${selection.name} not found in type environment`)
    return { type: 'identifier', name: { node: selection.name, location: emptyLocation(blockIdent) } }
}

function getDefaultFunction(selection: Selection & { type: 'function' }, typeEnvironment: Map<string, USSDocumentedType>, blockIdent: string): UrbanStatsASTExpression {
    const fn = typeEnvironment.get(selection.name)
    assert(fn !== undefined && fn.type.type === 'function', `Function ${selection.name} not found or not a function`)
    const args: UrbanStatsASTArg[] = []
    // Only include positional arguments by default, not named arguments with defaults
    for (let i = 0; i < fn.type.posArgs.length; i++) {
        const arg = fn.type.posArgs[i]
        assert(arg.type === 'concrete', `Positional argument must be concrete`)
        args.push({
            type: 'unnamed',
            value: createDefaultExpression(arg.value, extendBlockIdPositionalArg(blockIdent, i), typeEnvironment),
        })
    }
    const needed = Object.entries(fn.type.namedArgs).filter(([, a]) => a.defaultValue === undefined)
    for (const [name, argWDefault] of needed) {
        const arg = argWDefault.type
        assert(arg.type === 'concrete', `Named argument ${name} must be concrete`)
        args.push({
            type: 'named',
            name: { node: name, location: emptyLocation(blockIdent) },
            value: createDefaultExpression(arg.value, extendBlockIdKwarg(blockIdent, name), typeEnvironment),
        })
    }
    return {
        type: 'call',
        fn: { type: 'identifier', name: { node: selection.name, location: emptyLocation(blockIdent) } },
        args,
        entireLoc: emptyLocation(blockIdent),
    }
}

function deconstruct(expr: UrbanStatsASTExpression, typeEnvironment: Map<string, USSDocumentedType>, blockIdent: string, type: USSType, selection: Selection): UrbanStatsASTExpression | undefined {
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
                if (valid !== undefined && stableStringify(classifyExpr(valid)) === stableStringify(selection)) {
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
            if (type.type === 'opaque' && type.name === 'color' && selection.type === 'function') {
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
    typeEnvironment: Map<string, USSDocumentedType>,
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
            return parseNoErrorAsCustomNode(unparse(current), blockIdent, [type])
        case 'constant':
            return createDefaultExpression(type, blockIdent, typeEnvironment)
        case 'variable':
            return getDefaultVariable(selection as Selection & { type: 'variable' }, typeEnvironment, blockIdent)
        case 'function':
            return getDefaultFunction(selection as Selection & { type: 'function' }, typeEnvironment, blockIdent)
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

function maybeParseExpr(
    expr: UrbanStatsASTExpression | UrbanStatsASTStatement,
    blockIdent: string,
    type: USSType,
    typeEnvironment: Map<string, USSDocumentedType>,
): UrbanStatsASTExpression | undefined {
    try {
        return parseExpr(expr, blockIdent, [type], typeEnvironment, () => {
            throw new Error('parsing failed')
        }, false)
    }
    catch {}
    return
}

type Fallback = (uss: string, i: string, t: USSType[]) => UrbanStatsASTExpression

export function parseExpr(
    expr: UrbanStatsASTExpression | UrbanStatsASTStatement,
    blockIdent: string,
    types: USSType[],
    typeEnvironment: Map<string, USSDocumentedType>,
    fallback: Fallback,
    preserveCustomNodes: boolean,
): UrbanStatsASTExpression {
    const parsed = attemptParseExpr(expr, blockIdent, types, typeEnvironment, fallback, preserveCustomNodes)
    return parsed ?? fallback(unparse(expr), blockIdent, types)
}

function attemptParseExpr(
    expr: UrbanStatsASTExpression | UrbanStatsASTStatement,
    blockIdent: string,
    types: USSType[],
    typeEnvironment: Map<string, USSDocumentedType>,
    fallback: Fallback,
    preserveCustomNodes: boolean,
): UrbanStatsASTExpression | undefined {
    switch (expr.type) {
        case 'condition':
        case 'binaryOperator':
        case 'if':
        case 'assignment':
        case 'parseError':
        case 'attribute':
            return undefined
        case 'vectorLiteral':
            const elementTypes = types
                .filter(t => t.type === 'vector')
                .map(t => t.elementType)
                .filter(t => t.type !== 'elementOfEmptyVector') satisfies USSType[]
            if (elementTypes.length === 0) {
                return undefined
            }
            return {
                type: 'vectorLiteral',
                entireLoc: emptyLocation(blockIdent),
                elements: expr.elements.map((elem, idx) => parseExpr(elem, extendBlockIdVectorElement(blockIdent, idx), elementTypes, typeEnvironment, fallback, preserveCustomNodes)),
            }
        case 'objectLiteral':
            const exprProps = new Set(expr.properties.map(([key]) => key))
            const compatibleTypes = types.filter(
                (t) => {
                    if (t.type !== 'object') {
                        return false
                    }
                    if (t.properties.size !== expr.properties.length) {
                        return false
                    }
                    if (Array.from(t.properties.keys()).some(key => !exprProps.has(key))) {
                        return false
                    }
                    return true
                },
            ) as USSObjectType[]
            if (compatibleTypes.length === 0) {
                return undefined
            }
            return {
                type: 'objectLiteral',
                entireLoc: emptyLocation(blockIdent),
                properties: expr.properties.map(([key, value]) => [
                    key,
                    parseExpr(value, extendBlockIdObjectProperty(blockIdent, key), compatibleTypes.map(t => t.properties.get(key)!) satisfies USSType[], typeEnvironment, fallback, preserveCustomNodes),
                ]),
            }
        case 'do':
            const stmts = { type: 'statements', result: expr.statements, entireLoc: expr.entireLoc } satisfies UrbanStatsASTStatement
            return attemptParseExpr(stmts, blockIdent, types, typeEnvironment, fallback, preserveCustomNodes) ?? fallback(unparse(stmts), blockIdent, types)
        case 'customNode':
            if (preserveCustomNodes) {
                return parseNoErrorAsCustomNode(unparse(expr, { simplify: true }), blockIdent, expr.expectedType)
            }
            else {
                return parseExpr(expr.expr, blockIdent, types, typeEnvironment, fallback, preserveCustomNodes)
            }
        case 'statements':
            if (expr.result.length === 1) {
                return parseExpr(expr.result[0], blockIdent, types, typeEnvironment, fallback, preserveCustomNodes)
            }
            return undefined
        case 'expression':
            return parseExpr(expr.value, blockIdent, types, typeEnvironment, fallback, preserveCustomNodes)
        case 'identifier':
            const validVariableSelections = possibilities(types, typeEnvironment).filter(s => s.type === 'variable') as { type: 'variable', name: string }[]
            if (validVariableSelections.some(s => s.name === expr.name.node)) {
                return { type: 'identifier', name: { node: expr.name.node, location: emptyLocation(blockIdent) } }
            }
            return undefined
        case 'constant':
            if (types.some(type => type.type === expr.value.node.type)) {
                return { type: 'constant', value: { node: expr.value.node, location: emptyLocation(blockIdent) } }
            }
            return undefined
        case 'unaryOperator':
            if (expr.operator.node === '-' && expr.expr.type === 'constant' && expr.expr.value.node.type === 'number' && types.some(type => type.type === 'number')) {
                return {
                    type: 'constant',
                    value: { location: emptyLocation(blockIdent), node: { type: 'number', value: -(expr.expr.value.node.value) } },
                }
            }
            return undefined
        case 'call':
            const fn = expr.fn
            if (fn.type !== 'identifier') {
                return undefined
            }
            const validFunctionSelections = possibilities(types, typeEnvironment).filter(s => s.type === 'function') as { type: 'function', name: string }[]
            if (!validFunctionSelections.some(s => s.name === fn.name.node)) {
                return undefined
            }
            const tdoc = typeEnvironment.get(fn.name.node)
            if (!tdoc || tdoc.type.type !== 'function') {
                return undefined
            }
            const fnType = tdoc.type
            let positionals = expr.args.filter(a => a.type === 'unnamed') satisfies (UrbanStatsASTArg & { type: 'unnamed' })[]
            if (positionals.length !== fnType.posArgs.length) {
                return undefined
            }
            let nameds = expr.args.filter(a => a.type === 'named') satisfies (UrbanStatsASTArg & { type: 'named' })[]
            const names = new Set(nameds.map(a => a.name.node))
            const needed = Object.entries(fnType.namedArgs).filter(([, a]) => a.defaultValue === undefined)
            if (needed.some(([name]) => !names.has(name))) {
                return undefined
            }
            if (fnType.posArgs.some(a => a.type !== 'concrete')) {
                return undefined
            }
            positionals = positionals.map((a, i) => ({
                type: 'unnamed',
                value: parseExpr(a.value, extendBlockIdPositionalArg(blockIdent, i), [(fnType.posArgs[i] as { type: 'concrete', value: USSType }).value], typeEnvironment, fallback, preserveCustomNodes),
            }))
            if (Object.values(fnType.namedArgs).some(a => a.type.type !== 'concrete')) {
                return undefined
            }
            nameds = nameds.map(a => ({
                type: 'named',
                name: a.name,
                value: parseExpr(a.value, extendBlockIdKwarg(blockIdent, a.name.node), [(fnType.namedArgs[a.name.node].type as { type: 'concrete', value: USSType }).value], typeEnvironment, fallback, preserveCustomNodes),
            }))
            return {
                type: 'call',
                fn: { type: 'identifier', name: { node: fn.name.node, location: emptyLocation(blockIdent) } },
                args: [...positionals, ...nameds],
                entireLoc: emptyLocation(blockIdent),
            }
    }
}
