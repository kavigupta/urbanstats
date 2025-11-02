import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { CheckboxSettingCustom } from '../components/sidebar'
import { MapLabelComponent, Selection, SelectionContext } from '../mapper/components/MapLabel'
import { colorThemes } from '../page_template/color-themes'
import { OverrideTheme, useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { Property } from '../utils/Property'

import { MapLabel } from './constants/map-label'
import { useUndoRedo } from './editor-utils'

const newLabel: MapLabel = {
    bottomLeft: [0.25, 0.25],
    topRight: [0.75, 0.75],
    text: [{ insert: '\n' }], // bugs on applying attributes to empty text without this
    backgroundColor: colorThemes['Light Mode'].background,
    borderColor: colorThemes['Light Mode'].textMain,
    borderWidth: 1,
}

/**
 * This panel used for developing + debugging editor functionality.
 */
export function DebugEditorPanel(props: { undoChunking?: number }): ReactNode {
    const [edit, setEdit] = useState(true)
    const [content, setContent] = useState<MapLabel[]>(() => [newLabel])

    const selectionProperty = useMemo(() => new Property<Selection | undefined>(undefined), [])

    const { addState, updateCurrentSelection } = useUndoRedo<MapLabel[], Selection | undefined>(content, undefined, setContent, (newSelection) => {
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

    const updateContent = (newContent: MapLabel[]): void => {
        setContent(newContent)
        addState(newContent, selectionProperty.value)
    }

    const colors = useColors()

    const labels = content.map((label, i) => (
        <MapLabelComponent
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
    ))

    return (
        <PageTemplate>
            <CheckboxSettingCustom name="edit" checked={edit} onChange={setEdit} />
            <SelectionContext.Provider value={selectionProperty}>
                <OverrideTheme theme="Light Mode">
                    <div
                        style={{
                            width: '1000px',
                            height: '1000px',
                            backgroundColor: colors.hueColors.red,
                            position: 'relative',
                        }}
                        ref={containerRef}
                    >
                        {labels}
                    </div>
                </OverrideTheme>
            </SelectionContext.Provider>
        </PageTemplate>
    )
}
