import React, { createContext, ReactNode, RefObject, useContext, useRef } from 'react'

import { RichTextEditor } from '../../components/RichTextEditor'
import { Label } from '../../urban-stats-script/constants/label'
import { Range } from '../../urban-stats-script/editor-utils'
import { getAttribute, setAttribute } from '../../utils/AttributedText'
import { Property } from '../../utils/Property'

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

    return (
        <div
            style={{ position: 'absolute',
                left: `${label.bottomLeft[0] * 100}%`,
                bottom: `${label.bottomLeft[1] * 100}%`,
                width: `${(label.topRight[0] - label.bottomLeft[0]) * 100}%`,
                height: `${(label.topRight[1] - label.bottomLeft[1]) * 100}%` }}
            ref={divRef}
        >
            <div
                style={{
                    position: 'absolute',
                    bottom: '100%',
                    backgroundColor: `${label.backgroundColor}aa`,
                    border: `${label.borderWidth}px solid ${label.borderColor}`,
                    borderRadius: '5px 5px 0 0',
                    height: '50px',
                    width: '100%',
                }}
            >
                <input
                    type="color"
                    value={getAttribute(label.text, selection?.index === i ? selection.range : null, 'color')}
                    onChange={(e) => {
                        if (selection?.index === i) {
                            editLabel?.modify({ text: setAttribute(label.text, selection.range, 'color', e.target.value) })
                        }
                    }}
                    disabled={selection?.index !== i}
                />
            </div>
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
