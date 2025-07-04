import assert from 'assert'

import React, { ReactNode } from 'react'

import { CheckboxSettingJustBox } from '../../components/sidebar'
import { DisplayErrors } from '../../urban-stats-script/Editor'
import { UrbanStatsASTArg, UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { renderType, USSDocumentedType, USSType, USSFunctionArgType, USSRawValue } from '../../urban-stats-script/types-values'
import { useMobileLayout } from '../../utils/responsive'

import { CustomEditor } from './CustomEditor'
import { parseNoErrorAsExpression } from './utils'

type Selection = { type: 'variable' | 'function', name: string } | { type: 'custom' }

const labelWidth = '5%'

function ArgumentEditor(props: {
    name: string
    argWDefault: { type: USSFunctionArgType, defaultValue?: USSRawValue }
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
                                value: parseNoErrorAsExpression('', `${props.blockIdent}_${props.name}`),
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
}): ReactNode {
    const subcomponent = (): ReactNode => {
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
    const errorComponent = errors.length > 0
        ? (
                <DisplayErrors errors={errors} />
            )
        : null
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
                    props.setUss(defaultForSelection(selection, props.uss, props.typeEnvironment, props.blockIdent))
                }}
                typeEnvironment={props.typeEnvironment}
                type={props.type}
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
    for (const [name, type] of env) {
        const t: USSType = type.type
        if (renderType(t) === renderType(target)) {
            results.push({ type: 'variable', name })
        }
        else if (t.type === 'function' && t.returnType.type === 'concrete' && renderType(t.returnType.value) === renderType(target)) {
            results.push({ type: 'function', name })
        }
    }
    return results
}

export function Selector(props: {
    uss: UrbanStatsASTExpression
    setSelection: (selection: Selection) => void
    typeEnvironment: Map<string, USSDocumentedType>
    type: USSType
}): ReactNode {
    const selectionPossibilities = possibilities(props.type, props.typeEnvironment)
    const renderedSelectionPossibilities = selectionPossibilities.map(s => renderSelection(props.typeEnvironment, s))
    const selected = classifyExpr(props.uss)
    const selectedRendered = renderSelection(props.typeEnvironment, selected)
    assert(renderedSelectionPossibilities.includes(selectedRendered), 'Selected expression must be in the possibilities')
    // autocomplete selection  menu
    return (
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
    )
}

function classifyExpr(uss: UrbanStatsASTExpression): Selection {
    if (uss.type === 'customNode') {
        return { type: 'custom' }
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
    const doc = typeEnvironment.get(selection.name)?.documentation?.humanReadableName
    return doc ?? selection.name
}

function defaultForSelection(
    selection: Selection,
    current: UrbanStatsASTExpression,
    typeEnvironment: Map<string, USSDocumentedType>,
    blockIdent: string,
): UrbanStatsASTExpression {
    // TODO actually attempt to parse the current expression and use it as a default
    switch (selection.type) {
        case 'custom':
            return parseNoErrorAsExpression('', blockIdent)
        case 'variable':
            const type = typeEnvironment.get(selection.name)?.type
            assert(type, `Variable ${selection.name} not found in type environment`)
            return { type: 'identifier', name: { node: selection.name, location: emptyLocation(blockIdent) } }
        case 'function':
            const fn = typeEnvironment.get(selection.name)
            assert(fn && fn.type.type === 'function', `Function ${selection.name} not found or not a function`)
            const args: UrbanStatsASTArg[] = []
            // TODO better defaults
            // enumerate fn.posArgs then go through fn.namedArgs
            for (let i = 0; i < fn.type.posArgs.length; i++) {
                const arg = fn.type.posArgs[i]
                assert(arg.type === 'concrete', `Positional argument must be concrete`)
                args.push({
                    type: 'unnamed',
                    value: parseNoErrorAsExpression('', `${blockIdent}_${i}`),
                })
            }
            for (const [name] of Object.entries(fn.type.namedArgs)) {
                args.push({
                    type: 'named',
                    name: { node: name, location: emptyLocation(blockIdent) },
                    value: parseNoErrorAsExpression('', `${blockIdent}_${name}`),
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
