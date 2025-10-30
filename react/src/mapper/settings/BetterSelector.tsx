import stableStringify from 'json-stable-stringify'
import React, { ReactNode, useState, useEffect, useRef, useMemo } from 'react'

import { useColors } from '../../page_template/colors'
import { IFrameInput } from '../../utils/IFrameInput'
import { toNeedle } from '../../utils/bitap'
import { bitap } from '../../utils/bitap-selector'

import '../../common.css'

export const labelPadding = '4px'

const maxErrors = 31

export interface SelectorRenderResult { text: string, node?: (highlighted: boolean) => ReactNode }

function PencilButton({ onEdit }: { onEdit: () => void }): ReactNode {
    const size = { width: '20px', height: '20px' }
    const colors = useColors()
    return (
        <button
            style={{
                border: 'none',
                cursor: 'pointer',
                padding: '0 0',
                marginLeft: '4px',
                opacity: 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...size,
            }}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onEdit()
            }}
            title="Edit"
        >
            <img
                src={colors.pencilIcon}
                alt="Edit"
                style={{ ...size }}
            />
        </button>
    )
}

export function BetterSelector<T>({ value, onChange, possibleValues, renderValue, onEdit, iframe = false }: {
    value: T
    onChange: (newValue: T) => void
    possibleValues: readonly T[] // Memo this for performance
    renderValue: (v: T) => SelectorRenderResult // Memo this for performance
    onEdit?: () => void
    iframe?: boolean
}): ReactNode {
    const colors = useColors()

    const selectedRendered = renderValue(value)

    const [searchValue, setSearchValue] = useState(selectedRendered.text)
    const [isOpen, setIsOpen] = useState(false)
    const [highlightedIndex, setHighlightedIndex] = useState(0)

    const inputRef = useRef<HTMLInputElement>(null)

    const menuRef = useRef<HTMLDivElement>(null)

    // Needed if this component is reused in a different context
    useEffect(() => {
        setSearchValue(selectedRendered.text)
    }, [selectedRendered.text])

    const { bitapBuffers, options } = useMemo(() => {
        const optionsResult = possibleValues.map((choice, index) => ({ renderedChoice: renderValue(choice), index }))

        const longestSelectionPossibility = optionsResult.reduce((acc, poss) => Math.max(acc, poss.renderedChoice.text.toLowerCase().length), 0)
        const bitapBuffersResult = Array.from({ length: maxErrors + 1 }, () => new Uint32Array(31 + longestSelectionPossibility + 1))

        return {
            options: optionsResult,
            bitapBuffers: bitapBuffersResult,
        }
    }, [possibleValues, renderValue])

    const sortedOptions = useMemo(() => {
        const needle = toNeedle(searchValue.toLowerCase().slice(0, 31))

        return options.sort((a, b) => {
            const aScore = bitap(a.renderedChoice.text.toLowerCase(), needle, maxErrors, bitapBuffers)
            const bScore = bitap(b.renderedChoice.text.toLowerCase(), needle, maxErrors, bitapBuffers)
            if (aScore === bScore) {
                return a.renderedChoice.text.length - b.renderedChoice.text.length
            }
            return aScore - bScore
        })
    }, [bitapBuffers, searchValue, options])

    const handleOptionSelect = (option: typeof sortedOptions[number]): void => {
        const newValue = possibleValues[option.index]
        if (stableStringify(newValue) !== stableStringify(value)) {
            onChange(newValue)
        }
        setSearchValue(option.renderedChoice.text)
        setIsOpen(false)
        setHighlightedIndex(0)
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

    // eslint-disable-next-line no-restricted-syntax -- Dynamic tag name
    const InputElem = iframe ? IFrameInput : 'input'

    return (
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <InputElem
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
                    flex: 1,
                    padding: `${labelPadding} 8px`,
                    border: `1px solid ${colors.ordinalTextColor}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                }}
            />
            {onEdit && <PencilButton onEdit={onEdit} />}
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
                            onMouseDown={() => {
                                handleOptionSelect(option)
                            }}
                            onMouseUp={() => {
                                handleOptionSelect(option)
                                inputRef.current?.blur()
                            }}
                            style={{
                                cursor: 'pointer',
                                borderBottom: index < sortedOptions.length - 1 ? '1px solid #eee' : 'none',
                            }}
                            onMouseEnter={() => { setHighlightedIndex(index) }}
                        >
                            {option.renderedChoice.node?.(index === highlightedIndex) ?? <DefaultSelectorOption text={option.renderedChoice.text} highlighted={index === highlightedIndex} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function DefaultSelectorOption(props: { text: string, highlighted: boolean }): ReactNode {
    const colors = useColors()
    return (
        <div style={{
            padding: '8px 12px',
            background: (props.highlighted ? colors.slightlyDifferentBackgroundFocused : colors.slightlyDifferentBackground),
            color: props.text === '' ? colors.ordinalTextColor : colors.textMain,
        }}
        >
            {props.text === '' ? 'No Selection' : props.text}
        </div>
    )
}
