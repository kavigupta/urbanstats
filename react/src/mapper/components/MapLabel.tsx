import Color from 'color'
import React, { createContext, ReactNode, RefObject, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { RichTextEditor } from '../../components/RichTextEditor'
import { useColors } from '../../page_template/colors'
import { Label } from '../../urban-stats-script/constants/label'
import { Range } from '../../urban-stats-script/editor-utils'
import { getAttributes, setAttributes, TextAttributes } from '../../utils/AttributedText'
import { IFrameInput } from '../../utils/IFrameInput'
import { Property } from '../../utils/Property'
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

    const getCursorAttributes = useCallback((): TextAttributes => {
        return getAttributes(label.text, selection?.index === i ? selection.range : null)
    }, [label.text, selection, i])

    const [cursorAttributes, setCursorAttributes] = useState(getCursorAttributes)

    useEffect(() => {
        setCursorAttributes(getCursorAttributes)
    }, [getCursorAttributes])

    const colors = useColors()

    const maybeModifyAttributes = (newAttribs: Partial<TextAttributes>): void => {
        if (editLabel && selection?.index === i) {
            if (selection.range.start !== selection.range.end) {
                editLabel.modify({ text: setAttributes(label.text, selection.range, newAttribs) })
            }
            else {
                setCursorAttributes(a => ({ ...a, ...newAttribs }))
            }
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
                        onFocus={() => {
                            // Don't allow stealing focus
                            window.focus()
                        }}
                    />

                    {/* Font Size Picker */}
                    <IFrameInput
                        type="number"
                        value={cursorAttributes.fontSize.pixels}
                        onChange={(e) => {
                            maybeModifyAttributes({ fontSize: { pixels: Number(e.target.value) } })
                        }}
                        disabled={selection?.index !== i}
                    />

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
                                    }}
                                    >
                                        {v}
                                    </div>
                                ) })}
                            inputStyle={{ fontFamily: cursorAttributes.fontFamily }}
                            disabled={selection?.index !== i}
                        />
                    </div>

                    {/* Bold */}
                    <IFrameInput
                        type="button"
                        value="B"
                        onClick={() => {
                            maybeModifyAttributes({ fontWeight: cursorAttributes.fontWeight === 'normal' ? 'bold' : 'normal' })
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
                        }}
                        disabled={selection?.index !== i}
                        style={{ textDecoration: cursorAttributes.textDecoration }}
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
