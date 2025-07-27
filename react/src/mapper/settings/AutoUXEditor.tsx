import stableStringify from 'json-stable-stringify'
import React, { ReactNode, useState, useEffect, useRef, useMemo } from 'react'

import { CheckboxSettingJustBox } from '../../components/sidebar'
import { useColors } from '../../page_template/colors'
import { DisplayErrors } from '../../urban-stats-script/Editor'
import { UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { Color, doRender, hexToColor, hsvColorExpression, hsvToColor, rgbColorExpression, rgbToColor } from '../../urban-stats-script/constants/color'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { emptyLocation, parseNumber } from '../../urban-stats-script/lexer'
import { unparse, parseNoErrorAsCustomNode, parseNoErrorAsExpression } from '../../urban-stats-script/parser'
import { renderType, USSDocumentedType, USSType, USSFunctionArgType, USSDefaultValue } from '../../urban-stats-script/types-values'
import { DefaultMap } from '../../utils/DefaultMap'
import { toNeedle } from '../../utils/bitap'
import { bitap } from '../../utils/bitap-selector'
import { assert } from '../../utils/defensive'
import { useMobileLayout } from '../../utils/responsive'

import { CustomEditor } from './CustomEditor'

type Selection = { type: 'variable' | 'function', name: string } | { type: 'custom' } | { type: 'constant' } | { type: 'vector' } | { type: 'object' }

const labelPadding = '4px'

function shouldShowConstant(type: USSType): boolean {
    return type.type === 'number' || type.type === 'string'
}

function createDefaultExpression(type: USSType, blockIdent: string, typeEnvironment: Map<string, USSDocumentedType>): UrbanStatsASTExpression {
    if (type.type === 'vector') {
        return {
            type: 'vectorLiteral',
            entireLoc: emptyLocation(blockIdent),
            elements: [],
        }
    }
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
    return parseNoErrorAsCustomNode('', blockIdent, type)
}

function ArgumentEditor(props: {
    name: string
    argWDefault: { type: USSFunctionArgType, defaultValue?: USSDefaultValue }
    uss: UrbanStatsASTExpression & { type: 'function', fn: UrbanStatsASTExpression & { type: 'identifier' } }
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
    const subident = `${props.blockIdent}_${props.name}`

    // Get the function's documentation to find human-readable argument names
    const tdoc = props.typeEnvironment.get(functionUss.fn.name.node)
    const humanReadableName = tdoc?.documentation?.namedArgs?.[props.name] ?? props.name

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
                                name: { node: props.name, location: emptyLocation(subident) },
                                value: createDefaultExpression(arg.value, subident, props.typeEnvironment),
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
                                blockIdent={subident}
                                type={arg.value}
                                label={humanReadableName}
                            />
                        )
                    : (
                            <span>{humanReadableName}</span>
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
    const subcomponent = (): ReactNode | undefined => {
        if (props.uss.type === 'constant') {
            return undefined
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
            return undefined
        }
        if (uss.type === 'function') {
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
                        // cast is valid because we checked type above
                        uss={uss as UrbanStatsASTExpression & { type: 'function', fn: UrbanStatsASTExpression & { type: 'identifier' } }}
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
        if (uss.type === 'vectorLiteral') {
            // Determine the element type
            let elementType: USSType = { type: 'number' } // fallback
            if (props.type.type === 'vector') {
                elementType = props.type.elementType as USSType
            }
            return (
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
                                blockIdent={`${props.blockIdent}_el_${i}`}
                                type={elementType}
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
                                createDefaultExpression(elementType, `${props.blockIdent}_el_${uss.elements.length}`, props.typeEnvironment),
                            ]
                            props.setUss({ ...uss, elements: newElements })
                        }}
                    >
                        + Add element
                    </button>
                </div>
            )
        }
        if (uss.type === 'objectLiteral') {
            // Determine the element type
            let propertiesTypes: Map<string, USSType> = new DefaultMap(() => ({ type: 'number' })) // fallback
            if (props.type.type === 'object') {
                propertiesTypes = props.type.properties
            }
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5em', width: '100%' }}>
                    {Array.from(propertiesTypes.keys()).sort().map((key) => {
                        const propertyType = propertiesTypes.get(key)!
                        return (
                            <AutoUXEditor
                                key={key}
                                uss={uss.properties.find(([k]) => k === key)?.[1] ?? createDefaultExpression(propertyType, `${props.blockIdent}_prop_${key}`, props.typeEnvironment)}
                                setUss={(newVal) => {
                                    props.setUss({ ...uss, properties: uss.properties.map(([k, v]) => [k, k === key ? newVal : v]) })
                                }}
                                typeEnvironment={props.typeEnvironment}
                                errors={props.errors}
                                blockIdent={`${props.blockIdent}_prop_${key}`}
                                type={propertyType}
                                label={key}
                            />
                        )
                    })}
                </div>
            )
        }
        throw new Error(`Unsupported USS expression type: ${props.uss.type}`) // TODO handle other types
    }
    const leftSegment = (
        <div style={{ padding: `${labelPadding} 0px` }}>
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
                errors={props.errors}
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

    const wrappedSubcomponent = (): ReactNode => {
        const subc = subcomponent()
        if (subc === undefined) {
            return undefined
        }
        return (
            <div style={{ width: '100%', flex: 1 }}>
                <div style={{ display: 'flex', gap: '1em', marginLeft: labelWidth }}>
                    {props.label && <span style={{ minWidth: 'fit-content' }}></span>}
                    <div style={{ flex: 1 }}>
                        {subcomponent()}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1em', width: '100%', flex: 1 }} id={`auto-ux-editor-${props.blockIdent}`}>
            <div style={{ width: '100%', flex: 1 }}>{component()}</div>
            {wrappedSubcomponent()}
        </div>
    )
}

function possibilities(target: USSType, env: Map<string, USSDocumentedType>): Selection[] {
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
                        border: '1px solid #ccc',
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
                    style={{ width: '200px' }}
                    placeholder={isNumber ? 'Enter number' : 'Enter string'}
                />
            )}
            {colorValue !== undefined && (
                <input
                    type="color"
                    value={doRender(colorValue.color)}
                    style={{ width: '200px' }}
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

function getColor(expr: UrbanStatsASTExpression, typeEnvironment: Map<string, USSDocumentedType>): { color: Color, kind: 'rgb' | 'hsv' } | undefined {
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
                        return { color: rgbToColor(args[0], args[1], args[2]), kind: 'rgb' }
                    case 'hsv' :
                        return { color: hsvToColor(args[0], args[1], args[2]), kind: 'hsv' }
                    default:
                        return
                }
            }
        }
    }
    return
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
    if (uss.type === 'vectorLiteral') {
        return { type: 'vector' }
    }
    if (uss.type === 'objectLiteral') {
        return { type: 'object' }
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
    if (selection.type === 'vector') {
        return 'Manual List'
    }
    if (selection.type === 'object') {
        return 'Properties'
    }
    const doc = typeEnvironment.get(selection.name)?.documentation?.humanReadableName
    return doc ?? selection.name
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
            value: createDefaultExpression(arg.value, `${blockIdent}_pos_${i}`, typeEnvironment),
        })
    }
    const needed = Object.entries(fn.type.namedArgs).filter(([, a]) => a.defaultValue === undefined)
    for (const [name, argWDefault] of needed) {
        const arg = argWDefault.type
        assert(arg.type === 'concrete', `Named argument ${name} must be concrete`)
        args.push({
            type: 'named',
            name: { node: name, location: emptyLocation(blockIdent) },
            value: createDefaultExpression(arg.value, `${blockIdent}_${name}`, typeEnvironment),
        })
    }
    return {
        type: 'function',
        fn: { type: 'identifier', name: { node: selection.name, location: emptyLocation(blockIdent) } },
        args,
        entireLoc: emptyLocation(blockIdent),
    }
}

function deconstruct(expr: UrbanStatsASTExpression, typeEnvironment: Map<string, USSDocumentedType>, blockIdent: string, type: USSType, selection: Selection): UrbanStatsASTExpression | undefined {
    switch (expr.type) {
        case 'identifier': {
            const reference = typeEnvironment.get(expr.name.node)

            if (reference === undefined || !('value' in reference)) {
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
        case 'function': {
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
            return parseNoErrorAsCustomNode(unparse(current), blockIdent, type)
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
        return parseExpr(expr, blockIdent, type, typeEnvironment, () => {
            throw new Error('parsing failed')
        })
    }
    catch {}
    return
}

type Fallback = (uss: string, i: string, t: USSType) => UrbanStatsASTExpression

export function parseExpr(
    expr: UrbanStatsASTExpression | UrbanStatsASTStatement,
    blockIdent: string,
    type: USSType,
    typeEnvironment: Map<string, USSDocumentedType>,
    fallback: Fallback,
): UrbanStatsASTExpression {
    const parsed = attemptParseExpr(expr, blockIdent, type, typeEnvironment, fallback)
    return parsed ?? fallback(unparse(expr), blockIdent, type)
}

function attemptParseExpr(
    expr: UrbanStatsASTExpression | UrbanStatsASTStatement,
    blockIdent: string,
    type: USSType,
    typeEnvironment: Map<string, USSDocumentedType>,
    fallback: Fallback,
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
            if (type.type === 'vector') {
                const elementType = type.elementType
                if (elementType.type !== 'elementOfEmptyVector') {
                    return {
                        type: 'vectorLiteral',
                        entireLoc: emptyLocation(blockIdent),
                        elements: expr.elements.map(elem => parseExpr(elem, blockIdent, elementType, typeEnvironment, fallback)),
                    }
                }
            }
            return undefined
        case 'objectLiteral':
            if (type.type === 'object') {
                const exprProps = new Set(expr.properties.map(([key]) => key))
                // No duplicate keys
                if (exprProps.size === expr.properties.length && exprProps.size === type.properties.size && Array.from(type.properties.keys()).every(key => exprProps.has(key))) {
                    return {
                        type: 'objectLiteral',
                        entireLoc: emptyLocation(blockIdent),
                        properties: expr.properties.map(([key, value]) => [key, parseExpr(value, blockIdent, type.properties.get(key)!, typeEnvironment, fallback)]),
                    }
                }
            }
            return undefined
        case 'do':
            const stmts = { type: 'statements', result: expr.statements, entireLoc: expr.entireLoc } satisfies UrbanStatsASTStatement
            return attemptParseExpr(stmts, blockIdent, type, typeEnvironment, fallback) ?? fallback(unparse(stmts), blockIdent, type)
        case 'customNode':
            return parseExpr(expr.expr, blockIdent, type, typeEnvironment, fallback)
        case 'statements':
            if (expr.result.length === 1) {
                return parseExpr(expr.result[0], blockIdent, type, typeEnvironment, fallback)
            }
            return undefined
        case 'expression':
            return parseExpr(expr.value, blockIdent, type, typeEnvironment, fallback)
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
        case 'unaryOperator':
            if (expr.operator.node === '-' && expr.expr.type === 'constant' && expr.expr.value.node.type === 'number' && type.type === expr.expr.value.node.type) {
                return {
                    type: 'constant',
                    value: { location: expr.expr.value.location, node: { type: 'number', value: -(expr.expr.value.node.value as number) } },
                }
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
                value: parseExpr(a.value, `${blockIdent}_pos_${i}`, (fnType.posArgs[i] as { type: 'concrete', value: USSType }).value, typeEnvironment, fallback),
            }))
            if (Object.values(fnType.namedArgs).some(a => a.type.type !== 'concrete')) {
                return undefined
            }
            nameds = nameds.map(a => ({
                type: 'named',
                name: a.name,
                value: parseExpr(a.value, `${blockIdent}_${a.name.node}`, (fnType.namedArgs[a.name.node].type as { type: 'concrete', value: USSType }).value, typeEnvironment, fallback),
            }))
            return {
                type: 'function',
                fn: { type: 'identifier', name: { node: fn.name.node, location: emptyLocation(blockIdent) } },
                args: [...positionals, ...nameds],
                entireLoc: emptyLocation(blockIdent),
            }
    }
}
