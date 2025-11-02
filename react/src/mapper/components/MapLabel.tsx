import Color from 'color'
// eslint-disable-next-line import/no-named-as-default, import/default -- These don't like the import
import Quill, { Parchment, Range } from 'quill'
import React, { createContext, ReactNode, RefObject, useContext, useEffect, useRef, useState } from 'react'

import { defaults, QuillEditor } from '../../components/QuillEditor'
import { useColors } from '../../page_template/colors'
import { fromQuillDelta, Label, toQuillDelta } from '../../urban-stats-script/constants/label'
import { IFrameInput } from '../../utils/IFrameInput'
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

    const [format, setFormat] = useState(defaults)

    useEffect(() => {
        const quill = quillRef.current!
        const listener = (): void => {
            const currentSelection = quill.getSelection(false)
            if (currentSelection !== null) {
                const currentFormat = quill.getFormat(currentSelection.index, currentSelection.length)
                setFormat({ ...defaults, ...currentFormat })
            }
        }
        listener()
        quill.on('editor-change', listener)
        return () => {
            quill.off('editor-change', listener)
        }
    }, [quillRef])

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
                        height: '50px',
                        width: '100%',
                        display: 'flex',
                    }}
                >
                    {/* Color Picker */}
                    <IFrameInput
                        type="color"
                        value={Color(format.color).hex()}
                        onChange={(e) => {
                            quillRef.current!.format('color', Color(e.target.value).hex(), 'user')
                        }}
                        disabled={selection?.index !== i}
                        onFocus={refocus} // Since the picker doesn't always blur
                    />

                    {/* Font Size Picker */}
                    <div style={{ width: '50px' }}>
                        <BetterDatalist
                            iframe
                            value={format.size}
                            onChange={(fontSize) => {
                                quillRef.current!.format('size', fontSize, 'user')
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

                    {/* Font Family Picker */}
                    <div style={{ width: '200px' }}>
                        <BetterSelector
                            iframe
                            value={format.font}
                            onChange={(fontFamily) => {
                                quillRef.current!.format('font', fontFamily, 'user')
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
                    </div>

                    {/* Bold */}
                    <IFrameInput
                        type="button"
                        value="B"
                        onClick={() => {
                            quillRef.current!.format('bold', !format.bold, 'user')
                            refocus()
                        }}
                        disabled={selection?.index !== i}
                        style={{ fontWeight: format.bold ? 'bold' : 'normal' }}
                    />

                    {/* Italic */}
                    <IFrameInput
                        type="button"
                        value="I"
                        onClick={() => {
                            quillRef.current!.format('italic', !format.italic, 'user')
                            refocus()
                        }}
                        disabled={selection?.index !== i}
                        style={{ fontStyle: format.italic ? 'italic' : 'normal' }}
                    />

                    {/* Underline */}
                    <IFrameInput
                        type="button"
                        value="U"
                        onClick={() => {
                            quillRef.current!.format('underline', !format.underline, 'user')
                            refocus()
                        }}
                        disabled={selection?.index !== i}
                        style={{ textDecoration: format.underline ? 'underline' : 'none' }}
                    />

                    {/* Formula */}
                    <IFrameInput
                        type="button"
                        value="Formula"
                        onClick={() => {
                            if (selection?.index === i) {
                                const formula = prompt('Enter formula')
                                if (formula) {
                                    quillRef.current!.insertEmbed(selection.range.index, 'formula', formula, 'user')
                                }
                                refocus()
                            }
                        }}
                        disabled={selection?.index !== i}
                    />
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
