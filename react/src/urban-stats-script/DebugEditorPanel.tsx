import { Delta, Range } from 'quill'
import React, { ReactNode, useState } from 'react'

import { QuillEditor } from '../components/QuillEditor'
import { PageTemplate } from '../page_template/template'

import { useUndoRedo } from './editor-utils'

/**
 * This panel used for developing + debugging editor functionality.
 */
export function DebugEditorPanel(props: { undoChunking?: number }): ReactNode {
    const [content, setContent] = useState(() => new Delta().insert('Hello, World!'))
    const [selection, setSelection] = useState<Range | null>(null)

    const { addState, updateCurrentSelection } = useUndoRedo<Delta, Range | null>(content, null, setContent, setSelection, props)

    return (
        <PageTemplate>
            <QuillEditor
                editable={true}
                content={content}
                selection={selection}
                onSelectionChange={(range) => {
                    setSelection(range)
                    // We need this setTimeout since Quill calls the selection events before any text events
                    // This way, if we get a combined text and selection event, we update the new stack item instead of the old one
                    setTimeout(() => {
                        updateCurrentSelection(range)
                    })
                }}
                onTextChange={(text) => {
                    setContent(text)
                    addState(text, selection)
                }}
            />
        </PageTemplate>
    )
}
