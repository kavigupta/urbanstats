import { Delta, Range } from 'quill'
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { QuillEditor } from '../components/QuillEditor'
import { MapLabel, Selection, SelectionContext } from '../mapper/components/MapLabel'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { Property } from '../utils/Property'

import { Label } from './constants/label'
import { useUndoRedo } from './editor-utils'

/**
 * This panel used for developing + debugging editor functionality.
 */
export function DebugEditorPanel(props: { undoChunking?: number }): ReactNode {
    const [content, setContent] = useState<Label[]>(() => [{
        bottomLeft: [0.25, 0.25],
        topRight: [0.75, 0.75],
        text: [{ string: 'Hello, World!', attributes: {} }],
        backgroundColor: '#ffffff',
    }])

    const selectionProperty = useMemo(() => new Property<Selection | undefined>(undefined), [])

    const { addState, updateCurrentSelection } = useUndoRedo<Label[], Selection | undefined>(content, undefined, setContent, (newSelection) => {
        selectionProperty.value = newSelection
    }, props)

    // Update current selection when it changes
    useEffect(() => {
        const observer = (): void => {
            // We need this setTimeout since Quill calls the selection events before any text events
            // This way, if we get a combined text and selection event, we update the new stack item instead of the old one
            setTimeout(() => {
                updateCurrentSelection(selectionProperty.value)
            })
        }

        selectionProperty.observers.add(observer)
        return () => { selectionProperty.observers.delete(observer) }
    }, [selectionProperty, updateCurrentSelection])

    const containerRef = useRef<HTMLDivElement>(null)

    return (
        <PageTemplate>
            <SelectionContext.Provider value={selectionProperty}>
                <div
                    style={{
                        width: '1000px',
                        height: '1000px',
                        backgroundColor: '#ed7777ff',
                        position: 'relative',
                    }}
                    ref={containerRef}
                >
                    {content.map((label, i) => (
                        <MapLabel
                            key={i}
                            i={i}
                            numLabels={content.length}
                            label={label}
                            container={containerRef}
                            editLabel={{
                                modify(newLabel) {
                                    const newContent = content.map((l, j) => j === i ? { ...l, ...newLabel } : l)
                                    setContent(newContent)
                                    addState(newContent, selectionProperty.value)
                                },
                                duplicate() {

                                },
                                delete() {

                                },
                                add() {

                                },
                                moveUp() {

                                },
                                moveDown() {

                                },
                            }}
                        />
                    ))}
                </div>
            </SelectionContext.Provider>
        </PageTemplate>
    )
}
