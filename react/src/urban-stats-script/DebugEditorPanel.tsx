import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { CheckboxSettingCustom } from '../components/sidebar'
import { MapLabel, Selection, SelectionContext } from '../mapper/components/MapLabel'
import { colorThemes } from '../page_template/color-themes'
import { ThemeContext, useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { Property } from '../utils/Property'

import { Label } from './constants/label'
import { useUndoRedo } from './editor-utils'

const newLabel: Label = {
    bottomLeft: [0.25, 0.25],
    topRight: [0.75, 0.75],
    text: [
        { string: 'Hello, World!\n', attributes: { color: colorThemes['Light Mode'].textMain, fontSize: { pixels: 16 }, fontFamily: 'Jost', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' } },
        { string: 'Hello, World!\n', attributes: { color: colorThemes['Light Mode'].hueColors.green, fontSize: { pixels: 16 }, fontFamily: 'Times New Roman', fontWeight: 'normal', fontStyle: 'normal', textDecoration: 'none' } },
    ],
    backgroundColor: colorThemes['Light Mode'].background,
    borderColor: colorThemes['Light Mode'].textMain,
    borderWidth: 1,
}

/**
 * This panel used for developing + debugging editor functionality.
 */
export function DebugEditorPanel(props: { undoChunking?: number }): ReactNode {
    const [edit, setEdit] = useState(true)
    const [content, setContent] = useState<Label[]>(() => [newLabel])

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

    const updateContent = (newContent: Label[]): void => {
        setContent(newContent)
        addState(newContent, selectionProperty.value)
    }

    const colors = useColors()

    return (
        <PageTemplate>
            <CheckboxSettingCustom name="edit" checked={edit} onChange={setEdit} />
            <SelectionContext.Provider value={selectionProperty}>
                <ThemeContext.Provider value="Light Mode">

                    <div
                        style={{
                            width: '1000px',
                            height: '1000px',
                            backgroundColor: colors.hueColors.red,
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
                                editLabel={edit
                                    ? {
                                            modify(n) {
                                                updateContent(content.map((l, j) => j === i ? { ...l, ...n } : l))
                                            },
                                            duplicate() {
                                                updateContent(content.flatMap((l, j) => j === i ? [l, l] : [l]))
                                            },
                                            delete() {
                                                updateContent(content.filter((l, j) => j !== i))
                                            },
                                            add() {
                                                updateContent(content.concat([newLabel]))
                                            },
                                            moveUp() {
                                                updateContent(content.slice(0, i).concat([content[i + 1], content[i]]).concat(content.slice(i + 2)))
                                            },
                                            moveDown() {
                                                updateContent(content.slice(0, i - 1).concat([content[i], content[i - 1]]).concat(content.slice(i + 1)))
                                            },
                                        }
                                    : undefined}
                            />
                        ))}
                    </div>
                </ThemeContext.Provider>
            </SelectionContext.Provider>
        </PageTemplate>
    )
}
