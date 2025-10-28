import { Range } from 'quill'
import React, { createContext, ReactNode, RefObject, useContext, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { QuillEditor } from '../../components/QuillEditor'
import { fromQuillDelta, Label, toQuillDelta } from '../../urban-stats-script/constants/label'
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

    const [toolbarHeight, setToolbarHeight] = useState(0)

    useEffect(() => {
        const toolbar = divRef.current!.querySelector<HTMLDivElement>('.ql-toolbar')

        if (toolbar === null) {
            return // not editing
        }

        const observer = new ResizeObserver(() => {
            flushSync(() => {
                setToolbarHeight(toolbar.offsetHeight)
            })
        })
        setToolbarHeight(toolbar.offsetHeight)
        observer.observe(toolbar)
        return () => {
            observer.unobserve(toolbar)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only needs to change when the toolbar appears/disappears
    }, [!!editLabel])

    return (
        <div
            style={{ position: 'absolute',
                left: `${label.bottomLeft[0] * 100}%`,
                bottom: `${label.bottomLeft[1] * 100}%`,
                width: `${(label.topRight[0] - label.bottomLeft[0]) * 100}%`,
                height: `${(label.topRight[1] - label.bottomLeft[1]) * 100}%` }}
            ref={divRef}
        >
            <QuillEditor
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
                containerStyle={{ transform: editLabel ? `translateY(-${toolbarHeight}px)` : undefined, width: '100%', height: '100%' }}
                backgroundColor={label.backgroundColor}
                border={{ width: label.borderWidth, color: label.borderColor }}
                customControls={(
                    <>
                        <QuillColorPicker label="bg" color={label.backgroundColor} setColor={newColor => editLabel?.modify({ backgroundColor: newColor })} />
                        <QuillColorPicker label="border" color={label.borderColor} setColor={newColor => editLabel?.modify({ borderColor: newColor })} />
                    </>
                )}
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

function QuillColorPicker({ color, setColor, label }: { color: string, setColor: (c: string) => void, label: string }): ReactNode {
    return (
        <span className="ql-picker">
            <span className="ql-picker-label serif" onClick={(e) => { (e.target as HTMLSpanElement).querySelector('input')!.click() }}>
                {`${label} `}
                <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                        setColor(e.target.value)
                    }}
                    style={{ width: '20px', height: '20px' }}
                />
            </span>
        </span>
    )
}
