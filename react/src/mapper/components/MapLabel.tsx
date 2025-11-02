import Color from 'color'
// eslint-disable-next-line import/no-named-as-default, import/default -- These don't like the import
import Quill, { Parchment, Range } from 'quill'
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { QuillEditor } from '../../components/QuillEditor'
import { useColors } from '../../page_template/colors'
import { fromQuillDelta, Label, toQuillDelta, defaultAttributes } from '../../urban-stats-script/constants/label'
import { Property } from '../../utils/Property'
import { BetterDatalist } from '../settings/BetterDatalist'
import { BetterSelector } from '../settings/BetterSelector'

import { EditInsetsHandles } from './InsetMap'

export function MapLabel({ label, container, editLabel, i, numLabels }: {
    label: Label
    container: RefObject<HTMLDivElement>
    editLabel?: {
        modify: (newLabel: Partial<Label>) => void
        duplicate: () => void
        delete: () => void
        add: () => void
        moveUp: () => void
        moveDown: () => void
    }
    i: number
    numLabels: number
}): ReactNode {
    const selectionProperty = useContext(SelectionContext)
    const selection = selectionProperty.use()

    const divRef = useRef<HTMLDivElement>(null)

    const colors = useColors()

    const refocus = (): void => {
        if (selection?.index === i) {
            quillRef.current!.focus()
        }
    }
    const quillRef = useRef<Quill>()

    const [format, setFormat] = useState(defaultAttributes)

    const updateFormat = useCallback(() => {
        const quill = quillRef.current!
        const currentSelection = quill.getSelection(false)
        if (currentSelection !== null) {
            const currentFormat = quill.getFormat(currentSelection.index, currentSelection.length)
            setFormat({ ...defaultAttributes, ...currentFormat })
        }
    }, [])

    useEffect(() => {
        const quill = quillRef.current!
        updateFormat()
        quill.on('editor-change', updateFormat)
        return () => {
            quill.off('editor-change', updateFormat)
        }
    }, [updateFormat])

    return (
        <div
            style={{ position: 'absolute',
                left: `${label.bottomLeft[0] * 100}%`,
                bottom: `${label.bottomLeft[1] * 100}%`,
                width: `${(label.topRight[0] - label.bottomLeft[0]) * 100}%`,
                height: `${(label.topRight[1] - label.bottomLeft[1]) * 100}%` }}
            ref={divRef}
        >
            {editLabel && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        backgroundColor: `${label.backgroundColor}aa`,
                        border: `${label.borderWidth}px solid ${label.borderColor}`,
                        borderRadius: '5px 5px 0 0',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '5px',
                        flexWrap: 'wrap',
                        gap: '5px',
                        minWidth: 'fit-content',
                        minHeight: 'fit-content',
                    }}
                >
                    <div style={{ display: 'flex' }}>
                        {/* Font Family Picker */}
                        <BetterSelector
                            iframe
                            value={format.font}
                            onChange={(fontFamily) => {
                                quillRef.current!.format('font', fontFamily, 'user')
                                updateFormat()
                            }}
                            possibleValues={['Jost', 'Times New Roman']}
                            renderValue={v => ({
                                text: v,
                                node: highlighted => (
                                    <div style={{
                                        fontFamily: v,
                                        padding: '8px 12px',
                                        backgroundColor: highlighted ? colors.slightlyDifferentBackgroundFocused : undefined,
                                        color: colors.textMain,
                                    }}
                                    >
                                        {v}
                                    </div>
                                ) })}
                            inputStyle={{ fontFamily: format.font }}
                            disabled={selection?.index !== i}
                            onBlur={refocus}
                        />

                        {/* Font Size Picker */}
                        <BetterDatalist
                            iframe
                            value={format.size}
                            onChange={(fontSize) => {
                                if (/^[0-9]+$/.test(fontSize)) {
                                    fontSize = `${fontSize}px`
                                }
                                quillRef.current!.format('size', fontSize, 'user')
                                updateFormat()
                            }}
                            parse={(v) => {
                                return v
                            }}
                            possibleValues={[8, 10, 12, 14, 16, 20, 24, 36].map(n => `${n}px`)}
                            renderValue={v => ({
                                text: v,
                                node: highlighted => (
                                    <div style={{
                                        fontSize: v,
                                        fontFamily: format.font,
                                        padding: '8px 12px',
                                        backgroundColor: highlighted ? colors.slightlyDifferentBackgroundFocused : undefined,
                                        color: colors.textMain,
                                    }}
                                    >
                                        {v}
                                    </div>
                                ) })}
                            inputStyle={{ fontFamily: format.font }}
                            disabled={selection?.index !== i}
                            onBlur={refocus}
                        />
                    </div>

                    <div style={{ display: 'flex' }}>
                        {([
                            { display: 'B', key: 'bold', style: { fontWeight: 'bold ' } },
                            { display: 'I', key: 'italic', style: { fontStyle: 'italic' } },
                            { display: 'U', key: 'underline', style: { textDecoration: 'underline' } },
                        ] as const).map(({ display, key, style }, buttonIndex, { length }) => {
                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        quillRef.current!.format(key, !format[key], 'user')
                                        updateFormat()
                                        refocus()
                                    }}
                                    disabled={selection?.index !== i}
                                    style={{
                                        ...style,
                                        width: '24px',
                                        height: '24px',
                                        backgroundColor: format[key] ? colors.hueColors.blue : undefined,
                                        color: format[key] ? colors.buttonTextWhite : undefined,
                                        fontFamily: format.font,
                                        borderRadius: buttonIndex === 0 ? '5px 0 0 5px' : (buttonIndex === length - 1) ? '0 5px 5px 0' : 0,
                                        borderLeftWidth: buttonIndex > 0 ? 0 : undefined,
                                    }}
                                >
                                    {display}
                                </button>
                            )
                        })}
                    </div>

                    {/* Color Picker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <div style={{ color: colors.ordinalTextColor, fontSize: '12px' }}>Text</div>
                        <input
                            type="color"
                            value={Color(format.color).hex()}
                            onChange={(e) => {
                                quillRef.current!.format('color', Color(e.target.value).hex(), 'user')
                                updateFormat()
                            }}
                            disabled={selection?.index !== i}
                            onFocus={refocus}
                        />
                    </div>

                    <div style={{ display: 'flex' }}>
                        {([
                            '',
                            'center',
                            'right',
                            'justify',
                        ] as const).map((value, buttonIndex, { length }) => {
                            return (
                                <button
                                    key={value}
                                    onClick={() => {
                                        quillRef.current!.format('align', value, 'user')
                                        updateFormat()
                                        refocus()
                                    }}
                                    disabled={selection?.index !== i}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: format.align === value ? colors.hueColors.blue : undefined,
                                        borderRadius: buttonIndex === 0 ? '5px 0 0 5px' : (buttonIndex === length - 1) ? '0 5px 5px 0' : 0,
                                        borderLeftWidth: buttonIndex > 0 ? 0 : undefined,
                                    }}
                                >
                                    {alignIcon(value, format.align === value ? colors.buttonTextWhite : colors.textMain)}
                                </button>
                            )
                        })}
                    </div>

                    {/* Background Color Picker */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <div style={{ color: colors.ordinalTextColor, fontSize: '12px' }}>Background</div>
                        <input
                            type="color"
                            value={Color(label.backgroundColor).hex()}
                            onChange={(e) => {
                                editLabel.modify({ backgroundColor: Color(e.target.value).hex() })
                            }}
                        />
                    </div>

                    {/* Formula */}
                    <button
                        onClick={() => {
                            if (selection?.index === i) {
                                const formula = prompt('Enter formula')
                                if (formula) {
                                    quillRef.current!.insertEmbed(selection.range.index, 'formula', formula, 'user')
                                    quillRef.current!.insertText(selection.range.index + 1, ' ', 'user')
                                    quillRef.current!.setSelection(selection.range.index + 2, 'user')
                                }
                                refocus()
                            }
                        }}
                        disabled={selection?.index !== i}
                    >
                        x²
                    </button>
                </div>
            )}
            <QuillEditor
                quillRef={quillRef}
                editable={!!editLabel}
                content={toQuillDelta(label.text)}
                onTextChange={(delta) => {
                    editLabel!.modify({ text: fromQuillDelta(delta) })
                }}
                selection={selection?.index === i ? selection.range : null}
                onSelectionChange={(range) => {
                    if (range !== null) {
                        selectionProperty.value = { index: i, range }
                    }
                    else if (selectionProperty.value?.index === i) {
                        selectionProperty.value = undefined
                    }
                }}
                containerStyle={{ width: '100%', height: '100%', backgroundColor: label.backgroundColor, border: `${label.borderWidth}px solid ${label.borderColor}` }}
            />
            { editLabel && (
                <EditInsetsHandles
                    frame={[...label.bottomLeft, ...label.topRight]}
                    setFrame={(newFrame) => {
                        editLabel.modify({ bottomLeft: [newFrame[0], newFrame[1]], topRight: [newFrame[2], newFrame[3]] })
                    }}
                    container={container}
                    delete={editLabel.delete}
                    duplicate={editLabel.duplicate}
                    add={undefined}
                    shouldHaveCenterHandle={true}
                    moveUp={i + 1 < numLabels ? () => { editLabel.moveUp() } : undefined}
                    moveDown={i > 0 ? () => { editLabel.moveDown() } : undefined}
                />
            )}
        </div>
    )
}

export interface Selection {
    index: number
    range: Range
}

// eslint-disable-next-line no-restricted-syntax -- React context
export const SelectionContext = createContext(new Property<Selection | undefined>(undefined))

const fontAttributor = Quill.import('attributors/style/font') as Parchment.Attributor
fontAttributor.whitelist = undefined
Quill.register(fontAttributor, true)

const sizeAttributor = Quill.import('attributors/style/size') as Parchment.Attributor
sizeAttributor.whitelist = undefined
Quill.register(sizeAttributor, true)

function alignIcon(kind: '' | 'center' | 'right' | 'justify', color: string): ReactNode {
    // From https://fonts.google.com/icons
    const paths = {
        '': <path d="M120-120v-80h720v80H120Zm0-160v-80h480v80H120Zm0-160v-80h720v80H120Zm0-160v-80h480v80H120Zm0-160v-80h720v80H120Z" />,
        'center': <path d="M120-120v-80h720v80H120Zm160-160v-80h400v80H280ZM120-440v-80h720v80H120Zm160-160v-80h400v80H280ZM120-760v-80h720v80H120Z" />,
        'right': <path d="M120-760v-80h720v80H120Zm240 160v-80h480v80H360ZM120-440v-80h720v80H120Zm240 160v-80h480v80H360ZM120-120v-80h720v80H120Z" />,
        'justify': <path d="M120-120v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Zm0-160v-80h720v80H120Z" />,
    } as const

    return (
        <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill={color}>
            {paths[kind]}
        </svg>
    )
}
