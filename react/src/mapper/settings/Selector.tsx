import ColorLib from 'color'
import stableStringify from 'json-stable-stringify'
import React, { ReactNode, useMemo, useCallback } from 'react'

import { colorThemes } from '../../page_template/color-themes'
import { useColors } from '../../page_template/colors'
import { DisplayResults } from '../../urban-stats-script/Editor'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { hsvToColor, rgbToColor } from '../../urban-stats-script/constants/color'
import { Color, doRender, hexToColor, hsvColorExpression, rgbColorExpression } from '../../urban-stats-script/constants/color-utils'
import { RampT } from '../../urban-stats-script/constants/ramp'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation, parseNumber } from '../../urban-stats-script/lexer'
import { parseNoErrorAsCustomNode, parseNoErrorAsExpression } from '../../urban-stats-script/parser'
import { Documentation, TypeEnvironment, USSType } from '../../urban-stats-script/types-values'
import { TestUtils } from '../../utils/TestUtils'
import { assert } from '../../utils/defensive'

import * as l from './../../urban-stats-script/literal-parser'
import { BetterSelector, SelectorRenderResult } from './BetterSelector'
import { ActionOptions } from './EditMapperPanel'
import { parseExpr, possibilities, Selection } from './parseExpr'

export const labelPadding = '4px'

function isCustomConstructor(possibility: Selection, typeEnvironment: TypeEnvironment): boolean {
    return possibility.type === 'function' && typeEnvironment.get(possibility.name)?.documentation?.customConstructor === true
}

export function Selector(props: {
    uss: UrbanStatsASTExpression
    setSelection: (selection: Selection) => void
    setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void
    typeEnvironment: TypeEnvironment
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

    const hasCustomConstructor = useMemo(() => {
        return selectionPossibilities.some(possibility => isCustomConstructor(possibility, props.typeEnvironment)) && !isCustomConstructor(selected, props.typeEnvironment)
    }, [selectionPossibilities, props.typeEnvironment, selected])

    const renderPossibility = useCallback((selection: Selection) => renderSelection(props.typeEnvironment, selection), [props.typeEnvironment])

    const onEdit = useCallback(() => {
        const customConstructorOption = selectionPossibilities.find(possibility => isCustomConstructor(possibility, typeEnvironment))
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
                isNumber ? <NumberInput currentValue={currentValue} {...props} /> : <TextInput currentValue={currentValue} {...props} />
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
                            props.setUss(newUss, {})
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

function TextInput({ currentValue, blockIdent, setUss }: { currentValue: string, blockIdent: string, setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void }): ReactNode {
    return (
        <textarea
            value={currentValue}
            onChange={(e) => {
                const value = e.target.value
                setUss({
                    type: 'constant',
                    value: {
                        node: { type: 'string', value },
                        location: emptyLocation(blockIdent),
                    },
                }, {})
            }}
            style={{ width: '200px', fontSize: '14px', padding: '4px 8px', resize: 'vertical', borderRadius: TestUtils.shared.isTesting ? 0 : undefined }}
            placeholder="Enter string"
        />
    )
}

function NumberInput({ currentValue, blockIdent, setUss }: { currentValue: string, blockIdent: string, setUss: (u: UrbanStatsASTExpression, o: ActionOptions) => void }): ReactNode {
    return (
        <input
            type="text"
            value={currentValue}
            onChange={(e) => {
                const value = e.target.value
                let node: (UrbanStatsASTExpression & { type: 'constant' })['value']['node']
                let numberValue
                if ((numberValue = parseNumber(value)) !== undefined) {
                    node = { type: 'number', value: numberValue }
                }
                else {
                    node = { type: 'string', value }
                }
                const newUss: UrbanStatsASTExpression = {
                    type: 'constant',
                    value: {
                        node,
                        location: emptyLocation(blockIdent),
                    },
                }
                setUss(newUss, {})
            }}
            style={{ width: '200px', fontSize: '14px', padding: '4px 8px', resize: 'none' }}
            placeholder="Enter number"
        />
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

export function renderSelection(typeEnvironment: TypeEnvironment, selection: Selection): SelectorRenderResult {
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

export const colorSchema = l.transformExpr(l.customNodeExpr(l.deconstruct(l.call({
    fn: l.union([l.identifier('rgb'), l.identifier('hsv')]),
    unnamedArgs: [l.number(), l.number(), l.number()],
    namedArgs: { a: l.optional(l.number()) },
}))), (call) => {
    let color: Color | undefined
    switch (call.fn) {
        case 'rgb':
            color = rgbToColor(call.unnamedArgs[0], call.unnamedArgs[1], call.unnamedArgs[2], call.namedArgs.a ?? 1, true)
            break
        case 'hsv':
            color = hsvToColor(call.unnamedArgs[0], call.unnamedArgs[1], call.unnamedArgs[2], call.namedArgs.a ?? 1, true)
            break
    }
    if (color === undefined) {
        return undefined
    }
    return { color, kind: call.fn }
})

export function getColor(expr: UrbanStatsASTExpression, typeEnvironment: TypeEnvironment): { color: Color, kind: 'rgb' | 'hsv' } | undefined {
    try {
        return colorSchema.parse(expr, typeEnvironment)
    }
    catch {
        return
    }
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
