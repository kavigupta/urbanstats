import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

import { CheckboxSettingCustom } from '../../components/sidebar'
import { MapTextBoxComponent, Selection, SelectionContext } from '../../mapper/components/MapTextBox'
import { OverrideTheme, useColors } from '../../page_template/colors'
import { PageTemplate } from '../../page_template/template'
import { defaults, TextBox } from '../../urban-stats-script/constants/text-box'
import { Property } from '../../utils/Property'
import { useUndoRedo } from '../../utils/useUndoRedo'

const newLabel: TextBox = {
    bottomLeft: [0.25, 0.25],
    topRight: [0.75, 0.75],
    text: [{ insert: '\n' }], // bugs on applying attributes to empty text without this
    ...defaults,
}

/**
 * This panel used for developing + debugging map text box functionality.
 */
export function DebugMapTextBoxPanel(props: { undoChunking?: number }): ReactNode {
    const [edit, setEdit] = useState(true)
    const [content, setContent] = useState<TextBox[]>(() => [newLabel])

    const selectionProperty = useMemo(() => new Property<Selection | undefined>(undefined), [])

    const { addState, updateCurrentSelection } = useUndoRedo<TextBox[], Selection | undefined>(content, undefined, setContent, (newSelection) => {
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

    const updateContent = (newContent: TextBox[]): void => {
        setContent(newContent)
        addState(newContent, selectionProperty.value)
    }

    const colors = useColors()

    const labels = content.map((label, i) => (
        <MapTextBoxComponent
            key={i}
            i={i}
            count={content.length}
            textBox={label}
            container={containerRef}
            edit={edit
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
