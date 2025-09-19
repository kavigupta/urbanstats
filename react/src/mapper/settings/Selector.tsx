import ColorLib from 'color'
import stableStringify from 'json-stable-stringify'
import React, { ReactNode, useMemo, useCallback } from 'react'

import { colorThemes } from '../../page_template/color-themes'
import { useColors } from '../../page_template/colors'
import { DisplayResults } from '../../urban-stats-script/Editor'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { doRender, hsvColorExpression, hsvToColor, rgbColorExpression, rgbToColor } from '../../urban-stats-script/constants/color'
import { Color, hexToColor } from '../../urban-stats-script/constants/color-utils'
import { RampT } from '../../urban-stats-script/constants/ramp'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation, parseNumber } from '../../urban-stats-script/lexer'
import { parseNoErrorAsCustomNode, parseNoErrorAsExpression } from '../../urban-stats-script/parser'
import { Documentation, renderType, USSDocumentedType, USSType } from '../../urban-stats-script/types-values'
import { assert } from '../../utils/defensive'

import { parseExpr } from './AutoUXEditor'
import { BetterSelector, SelectorRenderResult } from './BetterSelector'

export const labelPadding = '4px'

export type Selection = { type: 'variable' | 'function', name: string } | { type: 'custom' } | { type: 'constant' } | { type: 'vector' } | { type: 'object' }

function shouldShowConstant(type: USSType): boolean {
    return type.type === 'number' || type.type === 'string'
}

export function possibilities(target: USSType[], env: Map<string, USSDocumentedType>): Selection[] {
    const results: Selection[] = []
    // Add vector option if the type is a vector
    if (target.some(t => t.type === 'vector')) {
        results.push({ type: 'vector' })
    }
    // Add properties option if the type is an object
    if (target.some(t => t.type === 'object')) {
        results.push({ type: 'object' })
    }
    // Add custom option for non-opaque or custom-allowed types
    if (target.some(t => t.type !== 'opaque' || t.allowCustomExpression !== false)) {
        results.push({ type: 'custom' })
    }
    // Add constant option for numbers and strings
    if (target.some(shouldShowConstant)) {
        results.push({ type: 'constant' })
    }
    else {
        const renderedTypes = target.map(renderType)
        // Only add variables and functions if constants are not shown
        const variables: Selection[] = []
        const functions: Selection[] = []
        for (const [name, type] of env) {
            const t: USSType = type.type
            // if (renderType(t) === renderType(target)) {
            if (renderedTypes.includes(renderType(t))) {
                variables.push({ type: 'variable', name })
            }
            else if (t.type === 'function' && t.returnType.type === 'concrete' && renderedTypes.includes(renderType(t.returnType.value))) {
                functions.push({ type: 'function', name })
            }
        }
        // Sort variables by priority (lower numbers first)
        variables.sort((a, b) => {
            const aPriority = a.type === 'variable' ? (env.get(a.name)?.documentation?.priority ?? 1) : 1
            const bPriority = b.type === 'variable' ? (env.get(b.name)?.documentation?.priority ?? 1) : 1
            return aPriority - bPriority
        })
        // Sort functions by priority (functions get priority 0 by default)
        functions.sort((a, b) => {
            const aPriority = a.type === 'function' ? (env.get(a.name)?.documentation?.priority ?? 0) : 0
            const bPriority = b.type === 'function' ? (env.get(b.name)?.documentation?.priority ?? 0) : 0
            return aPriority - bPriority
        })
        // Functions first, then variables
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
    type: USSType[]
    blockIdent: string
    errors: EditorError[]
}): ReactNode {
    const { setSelection, typeEnvironment } = props
    const selected = classifyExpr(props.uss)

    const selectionPossibilities = useMemo(() => {
        // Combine possibilities from all types
        const allPossibilities = new Set<Selection>()
        props.type.forEach((type) => {
            const typePossibilities = possibilities([type], props.typeEnvironment)
            typePossibilities.forEach(possibility => allPossibilities.add(possibility))
        })

        return Array.from(allPossibilities)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props.type keeps the same deep value but changes reference. It's simpler to stringify it here than track it down everywhere
    }, [stableStringify(props.type), props.typeEnvironment])

    // Check if there are any custom constructors available
    const hasCustomConstructor = useMemo(() => {
        return selectionPossibilities.some(possibility =>
            possibility.type === 'function' && props.typeEnvironment.get(possibility.name)?.documentation?.customConstructor,
        )
    }, [selectionPossibilities, props.typeEnvironment])

    const renderPossibility = useCallback((selection: Selection) => renderSelection(props.typeEnvironment, selection), [props.typeEnvironment])

    const onEdit = useCallback(() => {
        // Find the custom constructor option and select it
        const customConstructorOption = selectionPossibilities.find((possibility) => {
            if (possibility.type === 'function') {
                const doc = typeEnvironment.get(possibility.name)?.documentation
                return doc?.customConstructor === true
            }
            return false
        })
        if (customConstructorOption) {
            setSelection(customConstructorOption)
        }
    }, [selectionPossibilities, typeEnvironment, setSelection])

    if (selectionPossibilities.length < 2) {
        return undefined
    }

    const isNumber = props.type.some(type => type.type === 'number')
    const isString = props.type.some(type => type.type === 'string')
    const showConstantInput = selected.type === 'constant' && (isNumber || isString)
    const currentValue = props.uss.type === 'constant' ? props.uss.value.node.value.toString() : ''
    const errors = props.errors.filter(e => e.location.start.block.type === 'single' && e.location.start.block.ident === props.blockIdent)
    const errorComponent = <DisplayResults results={errors} editor={false} />

    const colorValue = props.type.some(type => type.type === 'opaque' && type.name === 'color') ? getColor(props.uss, props.typeEnvironment) : undefined

    const select = (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <BetterSelector
                value={selected}
                possibleValues={selectionPossibilities}
                renderValue={renderPossibility}
                onChange={props.setSelection}
                onEdit={hasCustomConstructor ? onEdit : undefined}
            />
            {showConstantInput && (
                <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => {
                        const value = e.target.value
                        let node: (UrbanStatsASTExpression & { type: 'constant' })['value']['node']
                        let numberValue
                        if (isNumber && (numberValue = parseNumber(value)) !== undefined) {
                            node = { type: 'number', value: numberValue }
                        }
                        else {
                            node = { type: 'string', value }
                        }
                        const newUss: UrbanStatsASTExpression = {
                            type: 'constant',
                            value: {
                                node,
                                location: emptyLocation(props.blockIdent),
                            },
                        }
                        props.setUss(newUss)
                    }}
                    style={{ width: '200px', fontSize: '14px', padding: '4px 8px' }}
                    placeholder={isNumber ? 'Enter number' : 'Enter string'}
                />
            )}
            {colorValue !== undefined && (
                <input
                    type="color"
                    value={doRender(colorValue.color, true)}
                    style={{ width: '200px', height: '30.5px' }}
                    onChange={(e) => {
                        const newColor = hexToColor(e.target.value)
                        const newColorUss = colorValue.kind === 'hsv' ? hsvColorExpression(newColor, { forceAlpha: colorValue.color.a }) : rgbColorExpression(newColor, { forceAlpha: colorValue.color.a })
                        let newUss: UrbanStatsASTExpression | undefined
                        switch (props.uss.type) {
                            case 'customNode':
                                newUss = parseNoErrorAsCustomNode(
                                    newColorUss,
                                    props.blockIdent,
                                    props.type,
                                )
                                break
                            case 'identifier':
                            case 'call':
                                newUss = parseNoErrorAsExpression(
                                    newColorUss,
                                    props.blockIdent,
                                )
                        }
                        if (newUss !== undefined) {
                            newUss = parseExpr(
                                newUss,
                                props.blockIdent,
                                props.type,
                                props.typeEnvironment,
                                () => { throw new Error('Should not happen') },
                                true,
                            )
                            props.setUss(newUss)
                        }
                    }}
                />
            )}
        </div>
    )
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
            {select}
            {errorComponent}
        </div>
    )
}

export function classifyExpr(uss: UrbanStatsASTExpression): Selection {
    if (uss.type === 'customNode') {
        return { type: 'custom' }
    }
    if (uss.type === 'constant') {
        return { type: 'constant' }
    }
    if (uss.type === 'identifier') {
        return { type: 'variable', name: uss.name.node }
    }
    if (uss.type === 'call') {
        const classifiedFn = classifyExpr(uss.fn)
        assert(classifiedFn.type === 'variable', 'Function must be a variable or another function')
        return { type: 'function', name: classifiedFn.name }
    }
    if (uss.type === 'vectorLiteral') {
        return { type: 'vector' }
    }
    if (uss.type === 'objectLiteral') {
        return { type: 'object' }
    }
    throw new Error(`Unsupported USS expression type: ${uss.type}`)
}

export function renderSelection(typeEnvironment: Map<string, USSDocumentedType>, selection: Selection): SelectorRenderResult {
    if (selection.type === 'custom') {
        return { text: 'Custom Expression' }
    }
    if (selection.type === 'constant') {
        return { text: 'Constant' }
    }
    if (selection.type === 'vector') {
        return { text: 'Manual List' }
    }
    if (selection.type === 'object') {
        return { text: 'Properties' }
    }
    const doc = typeEnvironment.get(selection.name)?.documentation
    if (doc?.selectorRendering?.kind === 'subtitleLongDescription') {
        return {
            text: doc.humanReadableName,
            node: highlighted => <LongDescriptionSubtitle doc={doc} highlighted={highlighted} />,
        }
    }
    if (doc?.selectorRendering?.kind === 'gradientBackground') {
        const ramp = doc.selectorRendering.ramp
        return {
            text: doc.humanReadableName,
            node: highlighted => <RampSelectorOption name={doc.humanReadableName} ramp={ramp} highlighted={highlighted} />,
        }
    }
    else {
        return { text: doc?.humanReadableName ?? selection.name }
    }
}

export function getColor(expr: UrbanStatsASTExpression, typeEnvironment: Map<string, USSDocumentedType>): { color: Color, kind: 'rgb' | 'hsv' } | undefined {
    switch (expr.type) {
        case 'customNode':
            if (expr.expr.type === 'expression') {
                return getColor(expr.expr.value, typeEnvironment)
            }
            return
        case 'identifier': {
            const reference = typeEnvironment.get(expr.name.node)

            if (reference === undefined || !('value' in reference)) {
                return
            }

            if (reference.type.type === 'opaque' && reference.type.name === 'color') {
                return { color: (reference.value as { value: Color }).value, kind: 'rgb' }
            }

            return
        }
        case 'call': {
            const posArgs = expr.args.flatMap((arg) => {
                if (arg.type === 'unnamed' && arg.value.type === 'constant' && arg.value.value.node.type === 'number') {
                    return [arg.value.value.node.value]
                }
                return []
            })
            const kwArg = expr.args.flatMap((arg) => {
                if (arg.type === 'named' && arg.name.node === 'a' && arg.value.type === 'constant' && arg.value.value.node.type === 'number') {
                    return [arg.value.value.node.value]
                }
                return []
            })
            assert(kwArg.length <= 1, 'There should be at most one "a" named argument')
            const alpha = kwArg.length === 1 ? kwArg[0] : 1
            if (expr.fn.type === 'identifier' && (posArgs.length === 3 || posArgs.length === 4)) {
                switch (expr.fn.name.node) {
                    case 'rgb':
                        const rgbColor = rgbToColor(posArgs[0], posArgs[1], posArgs[2], alpha, true)
                        if (rgbColor === undefined) {
                            return
                        }
                        return { color: rgbColor, kind: 'rgb' }
                    case 'hsv':
                        const hsvColor = hsvToColor(posArgs[0], posArgs[1], posArgs[2], alpha, true)
                        if (hsvColor === undefined) {
                            return
                        }
                        return { color: hsvColor, kind: 'hsv' }
                    default:
                        return
                }
            }
        }
    }
    return
}

function LongDescriptionSubtitle(props: { doc: Documentation, highlighted: boolean }): ReactNode {
    const colors = useColors()
    return (
        <div style={{
            padding: '8px 12px',
            background: props.highlighted ? colors.slightlyDifferentBackgroundFocused : colors.slightlyDifferentBackground,
        }}
        >
            <div>{props.doc.humanReadableName}</div>
            <div style={{ fontSize: 'smaller', color: colors.ordinalTextColor }}>
                {props.doc.longDescription}
            </div>
        </div>
    )
}

function RampSelectorOption(props: { name: string, ramp: RampT, highlighted: boolean }): ReactNode {
    const colors = useColors()
    const firstRampColor = ColorLib(props.ramp[0][1])
    const highlightedColor = `rgb(from ${colors.slightlyDifferentBackgroundFocused} r g b / 1)`
    return (
        <div style={{
            padding: '8px 12px',
            color: colorThemes[firstRampColor.isLight() ? 'Light Mode' : 'Dark Mode'].textMain,
            background: props.highlighted ? `${selectionGradient(highlightedColor, 'bottom')}, ${selectionGradient(highlightedColor, 'right')}, ${toCssGradient(props.ramp)}` : toCssGradient(props.ramp),
        }}
        >
            {props.name}
        </div>
    )
}

function toCssGradient(ramp: RampT): string {
    return `linear-gradient(to right, ${ramp.map(([pos, color]) => `${color} ${Math.round(pos * 100)}%`).join(', ')})`
}

function selectionGradient(selectionColor: string, direction: string): string {
    const border = `5px`
    return `linear-gradient(to ${direction}, ${selectionColor} ${border}, transparent ${border}, transparent calc(100% - ${border}), ${selectionColor} calc(100% - ${border}))`
}
