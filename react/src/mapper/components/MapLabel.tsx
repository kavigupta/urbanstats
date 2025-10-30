// eslint-disable-next-line import/no-named-as-default, import/default -- These don't like the import
import Quill, { Parchment, Range } from 'quill'
import React, { createContext, ReactNode, RefObject, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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

    const quillRef = useRef<Quill>()

    const [format, setFormat] = useState<{ size?: string, color?: string }>({})

    useEffect(() => {
        const quill = quillRef.current!
        const listener = (): void => {
            const currentSelection = quill.getSelection(false)
            if (currentSelection !== null) {
                const currentFormat = quill.getFormat(currentSelection.index, currentSelection.length)
                setFormat(currentFormat)
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
                <IFrameInput />
            </div>

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

// Should make this a drop in replacement for normal input and then use it in BetterSelector

function IFrameInput(): ReactNode {
    const frameRef = useRef<HTMLIFrameElement>(null)
    const [frameDoc, setFrameDoc] = useState<Document | undefined>()

    useEffect(() => {
        const doc = frameRef.current!.contentWindow!.document
        doc.body.style.margin = '0px'
        setFrameDoc(doc)
    }, [])

    return (
        <iframe ref={frameRef} style={{ border: 'none', width: '100px', height: '25px' }}>
            {frameDoc && createPortal(<input type="text" />, frameDoc.body)}
        </iframe>
    )
}

function parsePx(string: string): number | undefined {
    let match
    if ((match = /([0-9]+)px/.exec(string)) !== null) {
        const result = parseInt(match[1])
        if (isFinite(result)) {
            return result
        }
    }
    return
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
