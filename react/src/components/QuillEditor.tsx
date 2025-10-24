// eslint-disable-next-line import/no-named-as-default, import/default -- These don't like the import
import Quill, { Delta, EmitterSource, Range } from 'quill'
import React, { ReactNode, useEffect, useLayoutEffect, useRef } from 'react'

import 'quill/dist/quill.snow.css'

export function QuillEditor({ editable, content, selection, onTextChange, onSelectionChange }: {
    editable: boolean
    content: Delta
    selection: Range | null
    onTextChange: (delta: Delta) => void
    onSelectionChange: (range: Range | null) => void
}): ReactNode {
    const quillRef = useRef<Quill>()

    const containerRef = useRef<HTMLDivElement>(null)
    const onTextChangeRef = useRef(onTextChange)
    const onSelectionChangeRef = useRef(onSelectionChange)

    useLayoutEffect(() => {
        onTextChangeRef.current = onTextChange
        onSelectionChangeRef.current = onSelectionChange
    })

    useEffect(() => {
        const container = containerRef.current!
        const editorContainer = container.appendChild(
            container.ownerDocument.createElement('div'),
        )
        const quill = new Quill(editorContainer, {
            theme: 'snow',
            modules: {
                history: {
                    maxStack: 0,
                },
                toolbar: editable && [
                    ['bold', 'italic', 'underline', 'strike'], // toggled buttons
                    ['blockquote', 'code-block'],
                    ['link', 'image', 'video', 'formula'],

                    [{ header: 1 }, { header: 2 }], // custom button values
                    [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
                    [{ script: 'sub' }, { script: 'super' }], // superscript/subscript
                    [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
                    [{ direction: 'rtl' }], // text direction

                    [{ size: ['small', false, 'large', 'huge'] }], // custom dropdown
                    [{ header: [1, 2, 3, 4, 5, 6, false] }],

                    [{ color: [] }, { background: [] }], // dropdown with defaults from theme
                    [{ font: [] }],
                    [{ align: [] }],

                    ['clean'], // remove formatting button
                ],
            },
        })

        quillRef.current = quill

        quill.on(Quill.events.EDITOR_CHANGE, (name, ...args) => {
            switch (name) {
                case 'text-change':
                    {
                        const [delta, old, source] = args as [Delta, Delta, EmitterSource]
                        if (source !== 'api') {
                            onTextChangeRef.current(old.compose(delta))
                        }
                    }
                    break
                case 'selection-change':
                    {
                        const [range, , source] = args as [Range | null, Range | null, EmitterSource]
                        if (source !== 'api') {
                            onSelectionChangeRef.current(range)
                        }
                    }
                    break
            }
        })

        quill.enable(editable)

        return () => {
            quillRef.current = undefined
            container.innerHTML = ''
        }
    }, [editable])

    useEffect(() => {
        quillRef.current?.updateContents(quillRef.current.getContents().diff(content), 'api')
    }, [content])

    useEffect(() => {
        quillRef.current?.setSelection(selection, 'api')
    }, [selection])

    return <div ref={containerRef}></div>
}
