import React, { ReactNode, useState, useEffect, useRef, useMemo } from 'react'

import { useColors } from '../../page_template/colors'
import { DisplayErrors } from '../../urban-stats-script/Editor'
import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { Color, doRender, hexToColor, hsvColorExpression, hsvToColor, rgbColorExpression, rgbToColor } from '../../urban-stats-script/constants/color'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation, parseNumber } from '../../urban-stats-script/lexer'
import { parseNoErrorAsCustomNode, parseNoErrorAsExpression } from '../../urban-stats-script/parser'
import { renderType, USSDocumentedType, USSType } from '../../urban-stats-script/types-values'
import { toNeedle } from '../../utils/bitap'
import { bitap } from '../../utils/bitap-selector'
import { assert } from '../../utils/defensive'

export const labelPadding = '4px'

export type Selection = { type: 'variable' | 'function', name: string } | { type: 'custom' } | { type: 'constant' } | { type: 'vector' } | { type: 'object' }

function shouldShowConstant(type: USSType): boolean {
    return type.type === 'number' || type.type === 'string'
}

export function possibilities(target: USSType, env: Map<string, USSDocumentedType>): Selection[] {
    const results: Selection[] = []
    // Add vector option if the type is a vector
    if (target.type === 'vector') {
        results.push({ type: 'vector' })
    }
    // Add properties option if the type is an object
    if (target.type === 'object') {
        results.push({ type: 'object' })
    }
    // Add custom option for non-opaque or custom-allowed types
    if (target.type !== 'opaque' || target.allowCustomExpression !== false) {
        results.push({ type: 'custom' })
    }
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

const maxErrors = 31

export function Selector(props: {
    uss: UrbanStatsASTExpression
    setSelection: (selection: Selection) => void
    setUss: (u: UrbanStatsASTExpression) => void
    typeEnvironment: Map<string, USSDocumentedType>
    type: USSType
    blockIdent: string
    errors: EditorError[]
}): ReactNode {
    const colors = useColors()

    const selected = classifyExpr(props.uss)
    const selectedRendered = renderSelection(props.typeEnvironment, selected)

    const [searchValue, setSearchValue] = useState(selectedRendered)
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(0)

    const inputRef = useRef<HTMLInputElement>(null)

    const menuRef = useRef<HTMLDivElement>(null)

    // Needed if this component is reused in a different context
    useEffect(() => {
        setSearchValue(selectedRendered)
    }, [selectedRendered])

    const { selectionPossibilities, renderedSelectionPossibilities, bitapBuffers, optionSelectionPairs } = useMemo(() => {
        const selectionPossibilitiesResult = possibilities(props.type, props.typeEnvironment)
        const renderedSelectionPossibilitiesResult = selectionPossibilitiesResult.map(s => renderSelection(props.typeEnvironment, s))

        const longestSelectionPossibility = renderedSelectionPossibilitiesResult.reduce((acc, poss) => Math.max(acc, poss.toLowerCase().length), 0)
        const bitapBuffersResult = Array.from({ length: maxErrors + 1 }, () => new Uint32Array(31 + longestSelectionPossibility + 1))

        const optionSelectionPairsResult = selectionPossibilitiesResult.map((selection, index) => ({
            option: renderedSelectionPossibilitiesResult[index],
            selection,
        }))

        return {
            selectionPossibilities: selectionPossibilitiesResult,
            renderedSelectionPossibilities: renderedSelectionPossibilitiesResult,
            bitapBuffers: bitapBuffersResult,
            optionSelectionPairs: optionSelectionPairsResult,
        }
    }, [props.type, props.typeEnvironment])

    const { sortedOptions, optionToSelectionMap } = useMemo(() => {
        const needle = toNeedle(searchValue.toLowerCase().slice(0, 31))

        const sortedPairs = optionSelectionPairs.sort((a, b) => {
            const aScore = bitap(a.option.toLowerCase(), needle, maxErrors, bitapBuffers)
            const bScore = bitap(b.option.toLowerCase(), needle, maxErrors, bitapBuffers)
            return aScore - bScore
        })

        const optionToSelectionMapResult = new Map<string, Selection>()
        sortedPairs.forEach((pair) => {
            optionToSelectionMapResult.set(pair.option, pair.selection)
        })

        return {
            sortedOptions: sortedPairs.map(pair => pair.option),
            optionToSelectionMap: optionToSelectionMapResult,
        }
    }, [bitapBuffers, optionSelectionPairs, searchValue])

    assert(renderedSelectionPossibilities.includes(selectedRendered), 'Selected expression must be in the possibilities')

    if (selectionPossibilities.length < 2) {
        return undefined
    }

    const isNumber = props.type.type === 'number'
    const isString = props.type.type === 'string'
    const showConstantInput = selected.type === 'constant' && (isNumber || isString)
    const currentValue = props.uss.type === 'constant' ? props.uss.value.node : { type: isNumber ? 'number' : 'string', value: '' }
    const errors = props.errors.filter(e => e.location.start.block.type === 'single' && e.location.start.block.ident === props.blockIdent)
    const errorComponent = <DisplayErrors errors={errors} />

    const colorValue = props.type.type === 'opaque' && props.type.name === 'color' ? getColor(props.uss, props.typeEnvironment) : undefined

    const handleOptionSelect = (option: string): void => {
        const selection = optionToSelectionMap.get(option)
        if (selection) {
            props.setSelection(selection)
            setSearchValue(option)
            setIsOpen(false)
            setHighlightedIndex(0)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent): void => {
        if (!isOpen || sortedOptions.length === 0) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setHighlightedIndex(prev =>
                    prev < sortedOptions.length - 1 ? prev + 1 : 0,
                )
                break
            case 'ArrowUp':
                e.preventDefault()
                setHighlightedIndex(prev =>
                    prev > 0 ? prev - 1 : sortedOptions.length - 1,
                )
                break
            case 'Enter':
                e.preventDefault()
                if (highlightedIndex >= 0 && highlightedIndex < sortedOptions.length) {
                    handleOptionSelect(sortedOptions[highlightedIndex])
                }
                break
            case 'Escape':
                e.preventDefault()
                setIsOpen(false)
                setHighlightedIndex(0)
                break
        }
    }

    const select = (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <div style={{ position: 'relative', flex: 1 }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={searchValue}
                    onChange={(e) => {
                        setSearchValue(e.target.value)
                        setIsOpen(true)
                        setHighlightedIndex(0)
                        if (menuRef.current) {
                            menuRef.current.scrollTop = 0
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => {
                        (e.target as HTMLInputElement).select()
                    }}
                    onFocus={() => {
                        setIsOpen(true)
                        setHighlightedIndex(0)
                    }}
                    onBlur={() => {
                        // Delay closing to allow clicking on options
                        setTimeout(() => {
                            setIsOpen(false)
                            setHighlightedIndex(0)
                        }, 150)
                    }}
                    placeholder="Search options..."
                    style={{
                        width: '100%',
                        padding: `${labelPadding} 8px`,
                        border: `1px solid ${colors.ordinalTextColor}`,
                        borderRadius: '4px',
                        fontSize: '14px',
                    }}
                />
                {isOpen && sortedOptions.length > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: colors.background,
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            zIndex: 1000,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                        ref={menuRef}
                    >
                        {sortedOptions.map((option, index) => (
                            <div
                                key={index}
                                onClick={() => { handleOptionSelect(option) }}
                                onMouseUp={() => {
                                    handleOptionSelect(option)
                                    inputRef.current?.blur()
                                }}
                                style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderBottom: index < sortedOptions.length - 1 ? '1px solid #eee' : 'none',
                                    backgroundColor: index === highlightedIndex ? colors.slightlyDifferentBackgroundFocused : colors.slightlyDifferentBackground,
                                    color: colors.textMain,
                                }}
                                onMouseEnter={() => { setHighlightedIndex(index) }}
                            >
                                {option}
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
                    style={{ width: '200px', fontSize: '14px', padding: '4px 8px' }}
                    placeholder={isNumber ? 'Enter number' : 'Enter string'}
                />
            )}
            {colorValue !== undefined && (
                <input
                    type="color"
                    value={doRender(colorValue.color)}
                    style={{ width: '200px', height: '30.5px' }}
                    onChange={(e) => {
                        const newColor = hexToColor(e.target.value)
                        const newColorUss = colorValue.kind === 'hsv' ? hsvColorExpression(newColor) : rgbColorExpression(newColor)
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
                            case 'function':
                                newUss = parseNoErrorAsExpression(
                                    newColorUss,
                                    props.blockIdent,
                                )
                        }
                        if (newUss !== undefined) {
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
    if (uss.type === 'function') {
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

export function renderSelection(typeEnvironment: Map<string, USSDocumentedType>, selection: Selection): string {
    if (selection.type === 'custom') {
        return 'Custom Expression'
    }
    if (selection.type === 'constant') {
        return 'Constant'
    }
    if (selection.type === 'vector') {
        return 'Manual List'
    }
    if (selection.type === 'object') {
        return 'Properties'
    }
    const doc = typeEnvironment.get(selection.name)?.documentation?.humanReadableName
    return doc ?? selection.name
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
        case 'function': {
            const args = expr.args.flatMap((arg) => {
                let parsed
                if (arg.type === 'unnamed' && arg.value.type === 'constant' && arg.value.value.node.type === 'number' && (parsed = parseNumber(arg.value.value.node.value)) !== undefined) {
                    return [parsed]
                }
                return []
            })
            if (expr.fn.type === 'identifier' && args.length === 3) {
                switch (expr.fn.name.node) {
                    case 'rgb':
                        const rgbColor = rgbToColor(args[0], args[1], args[2], true)
                        if (rgbColor === undefined) {
                            return
                        }
                        return { color: rgbColor, kind: 'rgb' }
                    case 'hsv':
                        const hsvColor = hsvToColor(args[0], args[1], args[2], true)
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
