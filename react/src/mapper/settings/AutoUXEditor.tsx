import assert from 'assert'

import React, { ReactNode } from 'react'

import { CheckboxSettingJustBox } from '../../components/sidebar'
import { DisplayErrors } from '../../urban-stats-script/Editor'
import { UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { unparse } from '../../urban-stats-script/parser'
import { renderType, USSDocumentedType, USSType, USSFunctionArgType, USSDefaultValue } from '../../urban-stats-script/types-values'
import { useMobileLayout } from '../../utils/responsive'

import { CustomEditor } from './CustomEditor'
import { parseNoErrorAsExpression } from './utils'

type Selection = { type: 'variable' | 'function', name: string } | { type: 'custom' } | { type: 'constant' }

function shouldShowConstant(type: USSType): boolean {
    return type.type === 'number' || type.type === 'string'
}

function createDefaultExpression(type: USSType, blockIdent: string): UrbanStatsASTExpression {
    if (type.type === 'number') {
        return { type: 'constant', value: { node: { type: 'number', value: 0 }, location: emptyLocation(blockIdent) } }
    }
    if (type.type === 'string') {
        return { type: 'constant', value: { node: { type: 'string', value: '' }, location: emptyLocation(blockIdent) } }
    }
    return parseNoErrorAsExpression('', blockIdent)
}

function ArgumentEditor(props: {
    name: string
    argWDefault: { type: USSFunctionArgType, defaultValue?: USSDefaultValue }
    uss: UrbanStatsASTExpression & { type: 'function' }
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

    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5em', width: '100%' }}>
            {hasDefault && (
                <CheckboxSettingJustBox
                    checked={isEnabled}
                    onChange={(checked) => {
                        if (checked) {
                            // Add the argument with default value
                            const newArgs = [...functionUss.args, {
                                type: 'named' as const,
                                name: { node: props.name, location: emptyLocation(props.blockIdent) },
                                value: createDefaultExpression(arg.value, `${props.blockIdent}_${props.name}`),
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
            )}
            <div style={{ flex: 1 }}>
                {isEnabled
                    ? (
                            <AutoUXEditor
                                uss={argValue.value}
                                setUss={(newUss) => {
                                    const newArgs = functionUss.args.map(a => a.type === 'named' && a.name.node === props.name ? { ...a, value: newUss } : a)
                                    props.setUss({ ...functionUss, args: newArgs })
                                }}
                                typeEnvironment={props.typeEnvironment}
                                errors={props.errors}
                                blockIdent={`${props.blockIdent}_${props.name}`}
                                type={arg.value}
                                label={props.name}
                            />
                        )
                    : (
                            <span>{props.name}</span>
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
    type: USSType
    label?: string
    labelWidth?: string
}): ReactNode {
    const labelWidth = props.labelWidth ?? '5%'
    const subcomponent = (): ReactNode => {
        if (props.uss.type === 'constant') {
            return <></>
        }
        const uss = props.uss
        if (uss.type === 'customNode') {
            return (
                <CustomEditor
                    uss={uss}
                    setUss={props.setUss}
                    typeEnvironment={props.typeEnvironment}
                    errors={props.errors}
                    blockIdent={props.blockIdent}
                />
            )
        }
        if (uss.type === 'identifier') {
            return <></>
        }
        if (uss.type === 'function') {
            const fn = uss.fn
            assert(fn.type === 'identifier', 'Function must be an identifier')
            const tdoc = props.typeEnvironment.get(fn.name.node)
            assert(tdoc !== undefined, `Function ${fn.name.node} not found in type environment`)
            const type = tdoc.type
            assert(type.type === 'function', `Function ${fn.name.node} must be a function type`)
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
                        blockIdent={`${props.blockIdent}_pos_${i}`}
                        type={arg.value}
                    />,
                )
            })
            Object.entries(type.namedArgs).forEach(([name, argWDefault]) => {
                subselectors.push(
                    <ArgumentEditor
                        key={`named-${name}`}
                        name={name}
                        argWDefault={argWDefault}
                        uss={uss}
                        setUss={props.setUss}
                        typeEnvironment={props.typeEnvironment}
                        errors={props.errors}
                        blockIdent={props.blockIdent}
                    />,
                )
            })
            return (
                <div>
                    {...subselectors}
                </div>
            )
        }
        throw new Error(`Unsupported USS expression type: ${props.uss.type}`) // TODO handle other types
    }
    const errors = props.errors.filter(e => e.location.start.block.type === 'single' && e.location.start.block.ident === props.blockIdent)
    const errorComponent = <DisplayErrors errors={errors} />
    const leftSegment = (
        <div style={{ width: labelWidth }}>
            {props.label && <span style={{ minWidth: 'fit-content' }}>{props.label}</span>}
        </div>
    )
    const rightSegment = (
        <div style={{ width: `calc(100% - ${labelWidth})` }}>
            <Selector
                uss={props.uss}
                setSelection={(selection: Selection) => {
                    props.setUss(defaultForSelection(selection, props.uss, props.typeEnvironment, props.blockIdent, props.type))
                }}
                setUss={props.setUss}
                typeEnvironment={props.typeEnvironment}
                type={props.type}
                blockIdent={props.blockIdent}
            />
        </div>

    )

    const isMobile = useMobileLayout()

    const component = (): ReactNode => {
        if (isMobile) {
            return (
                <>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {leftSegment}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: labelWidth }} />
                        {rightSegment}
                    </div>
                </>
            )
        }
        else {
            return (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {leftSegment}
                    {rightSegment}
                </div>
            )
        }
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em' }}>
            {component()}
            <div style={{ display: 'flex', gap: '1em', marginLeft: labelWidth }}>
                {props.label && <span style={{ minWidth: 'fit-content' }}></span>}
                <div style={{ flex: 1 }}>
                    {subcomponent()}
                </div>
            </div>
            {errorComponent}
        </div>
    )
}

function possibilities(target: USSType, env: Map<string, USSDocumentedType>): Selection[] {
    const results: Selection[] = [{ type: 'custom' }]

    // Add constant option for numbers and strings
    if (shouldShowConstant(target)) {
        results.push({ type: 'constant' })
    }
    else {
        // Only add variables and functions if constants are not shown
        const variables: Selection[] = []
        const functions: Selection[] = []

        for (const [name, type] of env) {
            const t: USSType = type.type
            if (renderType(t) === renderType(target)) {
                variables.push({ type: 'variable', name })
            }
            else if (t.type === 'function' && t.returnType.type === 'concrete' && renderType(t.returnType.value) === renderType(target)) {
                functions.push({ type: 'function', name })
            }
        }

        results.push(...functions)
        results.push(...variables)
    }

    return results
}

export function Selector(props: {
    uss: UrbanStatsASTExpression
    setSelection: (selection: Selection) => void
    setUss: (u: UrbanStatsASTExpression) => void
    typeEnvironment: Map<string, USSDocumentedType>
    type: USSType
    blockIdent: string
}): ReactNode {
    const selectionPossibilities = possibilities(props.type, props.typeEnvironment)
    const renderedSelectionPossibilities = selectionPossibilities.map(s => renderSelection(props.typeEnvironment, s))
    const selected = classifyExpr(props.uss)
    const selectedRendered = renderSelection(props.typeEnvironment, selected)
    assert(renderedSelectionPossibilities.includes(selectedRendered), 'Selected expression must be in the possibilities')

    const isNumber = props.type.type === 'number'
    const isString = props.type.type === 'string'
    const showConstantInput = selected.type === 'constant' && (isNumber || isString)
    const currentValue = props.uss.type === 'constant' ? props.uss.value.node : { type: isNumber ? 'number' : 'string', value: '' }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <select
                id="selector"
                value={selectedRendered}
                onChange={(e) => {
                    const selectedName = e.target.value
                    const selection = selectionPossibilities[renderedSelectionPossibilities.indexOf(selectedName)]
                    props.setSelection(selection)
                }}
            >
                {renderedSelectionPossibilities.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                ))}
            </select>
            {showConstantInput && (
                <input
                    type="text"
                    value={currentValue.value}
                    onChange={(e) => {
                        const value = e.target.value
                        const newUss = {
                            type: 'constant' as const,
                            value: {
                                node: { type: isNumber ? 'number' : 'string', value },
                                location: emptyLocation(props.blockIdent),
                            },
                        } satisfies UrbanStatsASTExpression
                        props.setUss(newUss)
                    }}
                    style={{ width: '200px' }}
                    placeholder={isNumber ? 'Enter number' : 'Enter string'}
                />
            )}
        </div>
    )
}

function classifyExpr(uss: UrbanStatsASTExpression): Selection {
    if (uss.type === 'customNode') {
        return { type: 'custom' }
    }
    if (uss.type === 'constant') {
        return { type: 'constant' }
    }
    if (uss.type === 'identifier') {
        return { type: 'variable', name: uss.name.node }
    }
    if (uss.type === 'function') {
        const classifiedFn = classifyExpr(uss.fn)
        assert(classifiedFn.type === 'variable', 'Function must be a variable or another function')
        return { type: 'function', name: classifiedFn.name }
    }
    throw new Error(`Unsupported USS expression type: ${uss.type}`)
}

function renderSelection(typeEnvironment: Map<string, USSDocumentedType>, selection: Selection): string {
    if (selection.type === 'custom') {
        return 'Custom Expression'
    }
    if (selection.type === 'constant') {
        return 'Constant'
    }
    const doc = typeEnvironment.get(selection.name)?.documentation?.humanReadableName
    return doc ?? selection.name
}

function defaultForSelection(
    selection: Selection,
    current: UrbanStatsASTExpression,
    typeEnvironment: Map<string, USSDocumentedType>,
    blockIdent: string,
    type: USSType,
): UrbanStatsASTExpression {
    // TODO actually attempt to parse the current expression and use it as a default
    switch (selection.type) {
        case 'custom':
            return parseNoErrorAsExpression('', blockIdent)
        case 'constant':
            return createDefaultExpression(type, blockIdent)
        case 'variable':
            const varType = typeEnvironment.get(selection.name)?.type
            assert(varType, `Variable ${selection.name} not found in type environment`)
            return { type: 'identifier', name: { node: selection.name, location: emptyLocation(blockIdent) } }
        case 'function':
            const fn = typeEnvironment.get(selection.name)
            assert(fn && fn.type.type === 'function', `Function ${selection.name} not found or not a function`)
            const args: UrbanStatsASTArg[] = []
            // Only include positional arguments by default, not named arguments with defaults
            for (let i = 0; i < fn.type.posArgs.length; i++) {
                const arg = fn.type.posArgs[i]
                assert(arg.type === 'concrete', `Positional argument must be concrete`)
                args.push({
                    type: 'unnamed',
                    value: createDefaultExpression(arg.value, `${blockIdent}_pos_${i}`),
                })
            }
            // Include named arguments that don't have defaults
            const needed = Object.entries(fn.type.namedArgs).filter(([, a]) => a.defaultValue === undefined)
            for (const [name, argWDefault] of needed) {
                const arg = argWDefault.type
                assert(arg.type === 'concrete', `Named argument ${name} must be concrete`)
                args.push({
                    type: 'named',
                    name: { node: name, location: emptyLocation(blockIdent) },
                    value: createDefaultExpression(arg.value, `${blockIdent}_${name}`),
                })
            }
            return {
                type: 'function',
                fn: { type: 'identifier', name: { node: selection.name, location: emptyLocation(blockIdent) } },
                args,
                entireLoc: emptyLocation(blockIdent),
            }
    }
}

export function parseExpr(
    expr: UrbanStatsASTExpression | UrbanStatsASTStatement,
    blockIdent: string,
    type: USSType,
    typeEnvironment: Map<string, USSDocumentedType>,
): UrbanStatsASTExpression {
    const parsed = attemptParseExpr(expr, blockIdent, type, typeEnvironment)
    return parsed ?? parseNoErrorAsExpression(unparse(expr), blockIdent)
}

function attemptParseExpr(
    expr: UrbanStatsASTExpression | UrbanStatsASTStatement,
    blockIdent: string,
    type: USSType,
    typeEnvironment: Map<string, USSDocumentedType>,
): UrbanStatsASTExpression | undefined {
    switch (expr.type) {
        case 'condition':
        case 'unaryOperator':
        case 'binaryOperator':
        case 'objectLiteral':
        case 'vectorLiteral':
        case 'if':
        case 'assignment':
        case 'parseError':
        case 'attribute':
            return undefined
        case 'customNode':
            return parseExpr(expr.expr, blockIdent, type, typeEnvironment)
        case 'statements':
            if (expr.result.length === 1) {
                return parseExpr(expr.result[0], blockIdent, type, typeEnvironment)
            }
            return undefined
        case 'expression':
            return parseExpr(expr.value, blockIdent, type, typeEnvironment)
        case 'identifier':
            const validVariableSelections = possibilities(type, typeEnvironment).filter(s => s.type === 'variable') as { type: 'variable', name: string }[]
            if (validVariableSelections.some(s => s.name === expr.name.node)) {
                return expr
            }
            return undefined
        case 'constant':
            if (type.type === expr.value.node.type) {
                return expr
            }
            return undefined
        case 'function':
            const fn = expr.fn
            if (fn.type !== 'identifier') {
                return undefined
            }
            const validFunctionSelections = possibilities(type, typeEnvironment).filter(s => s.type === 'function') as { type: 'function', name: string }[]
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
                value: parseExpr(a.value, `${blockIdent}_pos_${i}`, (fnType.posArgs[i] as { type: 'concrete', value: USSType }).value, typeEnvironment),
            }))
            if (Object.values(fnType.namedArgs).some(a => a.type.type !== 'concrete')) {
                return undefined
            }
            nameds = nameds.map(a => ({
                type: 'named',
                name: a.name,
                value: parseExpr(a.value, `${blockIdent}_${a.name.node}`, (fnType.namedArgs[a.name.node].type as { type: 'concrete', value: USSType }).value, typeEnvironment),
            }))
            return {
                type: 'function',
                fn: { type: 'identifier', name: { node: fn.name.node, location: emptyLocation(blockIdent) } },
                args: [...positionals, ...nameds],
                entireLoc: emptyLocation(blockIdent),
            }
    }
}
