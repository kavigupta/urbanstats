import Color from 'color'
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { RichTextEditor } from '../../components/RichTextEditor'
import { useColors } from '../../page_template/colors'
import { Label } from '../../urban-stats-script/constants/label'
import { Range, setRange } from '../../urban-stats-script/editor-utils'
import { concat, getAttributes, length, setAttributes, slice, StringAttributes } from '../../utils/AttributedText'
import { IFrameInput } from '../../utils/IFrameInput'
import { Property } from '../../utils/Property'
import { BetterDatalist, cannotParse } from '../settings/BetterDatalist'
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

    const getCursorAttributes = useCallback((): StringAttributes => {
        return getAttributes(label.text, selection?.index === i ? selection.range : null)
    }, [label.text, selection, i])

    const [cursorAttributes, setCursorAttributes] = useState(getCursorAttributes)

    useEffect(() => {
        setCursorAttributes(getCursorAttributes)
    }, [getCursorAttributes])

    const colors = useColors()

    const editorRef = useRef<HTMLPreElement>(null)

    const maybeModifyAttributes = (newAttribs: Partial<StringAttributes>): void => {
        if (editLabel && selection?.index === i) {
            if (selection.range.start !== selection.range.end) {
                editLabel.modify({ text: setAttributes(label.text, selection.range, newAttribs) })
            }
            else {
                setCursorAttributes(a => ({ ...a, ...newAttribs }))
            }
        }
    }

    const refocus = (): void => {
        if (selection?.index === i) {
            editorRef.current!.focus()
            setRange(editorRef.current!, selection.range)
        }
    }

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
                        value={Color(cursorAttributes.color).hex()}
                        onChange={(e) => {
                            maybeModifyAttributes({ color: e.target.value })
                        }}
                        disabled={selection?.index !== i}
                        onFocus={refocus}
                    />

                    {/* Font Size Picker */}
                    <div style={{ width: '50px' }}>
                        <BetterDatalist
                            iframe
                            value={cursorAttributes.fontSize}
                            onChange={(fontSize) => {
                                maybeModifyAttributes({ fontSize })
                            }}
                            parse={(v) => {
                                const result = parseFloat(v)
                                if (isFinite(result)) {
                                    return { kind: 'pixels' as const, pixels: result }
                                }
                                return cannotParse
                            }}
                            possibleValues={[8, 10, 12, 14, 16, 20, 24, 36].map(n => ({ kind: 'pixels' as const, pixels: n }))}
                            renderValue={v => ({
                                text: v.pixels.toString(),
                                node: highlighted => (
                                    <div style={{
                                        fontSize: `${v.pixels}px`,
                                        fontFamily: cursorAttributes.fontFamily,
                                        padding: '8px 12px',
                                        backgroundColor: highlighted ? colors.slightlyDifferentBackgroundFocused : undefined,
                                        color: colors.textMain,
                                    }}
                                    >
                                        {v.pixels.toString()}
                                    </div>
                                ) })}
                            inputStyle={{ fontFamily: cursorAttributes.fontFamily }}
                            disabled={selection?.index !== i}
                            onBlur={refocus}
                        />
                    </div>

                    {/* Font Family Picker */}
                    <div style={{ width: '200px' }}>
                        <BetterSelector
                            iframe
                            value={cursorAttributes.fontFamily}
                            onChange={(fontFamily) => {
                                maybeModifyAttributes({ fontFamily })
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
                            inputStyle={{ fontFamily: cursorAttributes.fontFamily }}
                            disabled={selection?.index !== i}
                            onBlur={refocus}
                        />
                    </div>

                    {/* Bold */}
                    <IFrameInput
                        type="button"
                        value="B"
                        onClick={() => {
                            maybeModifyAttributes({ fontWeight: cursorAttributes.fontWeight === 'normal' ? 'bold' : 'normal' })
                            refocus()
                        }}
                        disabled={selection?.index !== i}
                        style={{ fontWeight: cursorAttributes.fontWeight }}
                    />

                    {/* Italic */}
                    <IFrameInput
                        type="button"
                        value="I"
                        onClick={() => {
                            maybeModifyAttributes({ fontStyle: cursorAttributes.fontStyle === 'normal' ? 'italic' : 'normal' })
                            refocus()
                        }}
                        disabled={selection?.index !== i}
                        style={{ fontStyle: cursorAttributes.fontStyle }}
                    />

                    {/* Underline */}
                    <IFrameInput
                        type="button"
                        value="U"
                        onClick={() => {
                            maybeModifyAttributes({ textDecoration: cursorAttributes.textDecoration === 'none' ? 'underline' : 'none' })
                            refocus()
                        }}
                        disabled={selection?.index !== i}
                        style={{ textDecoration: cursorAttributes.textDecoration }}
                    />

                    {/* Formula */}
                    <IFrameInput
                        type="button"
                        value="Formula"
                        onClick={() => {
                            if (selection?.index === i) {
                                const formula = prompt('Enter formula')
                                if (formula) {
                                    editLabel.modify({
                                        text: concat([
                                            slice(label.text, { start: 0, end: selection.range.start }),
                                            [{ kind: 'formula', formula, attributes: getAttributes(label.text, selection.range) }],
                                            slice(label.text, { start: selection.range.end, end: length(label.text) }),
                                        ]),
                                    })
                                }
                                refocus()
                            }
                        }}
                        disabled={selection?.index !== i}
                    />
                </div>
            )}
            <RichTextEditor
                style={{ width: '100%', height: '100%', backgroundColor: label.backgroundColor, border: `${label.borderWidth}px solid ${label.borderColor}`, padding: '0.5em' }}
                text={label.text}
                setText={(newText) => { editLabel!.modify({ text: newText }) }}
                selection={selection?.index === i ? selection.range : null}
                setSelection={(range) => {
                    if (range !== null) {
                        selectionProperty.value = { index: i, range }
                    }
                    else if (selectionProperty.value?.index === i) {
                        selectionProperty.value = undefined
                    }
                }}
                editable={!!editLabel}
                cursorAttributes={cursorAttributes}
                eRef={editorRef}
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
                    /*
                                Allowing reordering on the main map in case you want to put its corner in front of an inset or something
                                it also eliminates the weird edge case where the main map is not the 0th inset
                                */
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
