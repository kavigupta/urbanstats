import katex from 'katex'
// eslint-disable-next-line import/no-named-as-default, import/default -- These don't like the import
import Quill, { Delta, EmitterSource, Range } from 'quill'
import Block from 'quill/blots/block'
import React, { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef } from 'react'

import 'katex/dist/katex.css'
import 'quill/dist/quill.snow.css'
import { colorThemes } from '../page_template/color-themes'

// Needed for formula module
(window as { katex: unknown }).katex = katex

function DefaultStyle(): ReactNode {
    return (
        <style>
            {`
.ql-editor { font-family: jost; font-size: 16px; color: ${colorThemes['Light Mode'].textMain} }
.ql-container.ql-snow { border: none; }
.ql-toolbar.ql-snow { border: none; }
`}
        </style>
    )
}

// Sets the default style
class DefaultBlock extends Block {
    static override create(): HTMLElement {
        const node = super.create()
        node.setAttribute('style', 'font-family: jost; font-size: 16px;') // Example customization
        return node
    }
}
Quill.register(DefaultBlock)

export interface QuillEditorProps {
    editable: boolean
    content: Delta
    selection: Range | null
    onTextChange: (delta: Delta) => void
    onSelectionChange: (range: Range | null) => void
    containerStyle?: CSSProperties
    toolbar: string | false
    quillRef: React.MutableRefObject<Quill | undefined>
}

export function QuillEditor({ editable, content, selection, onTextChange, onSelectionChange, containerStyle, toolbar, quillRef }: QuillEditorProps): ReactNode {
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
                    maxStack: 0, // We use our own undo manager
                },
                toolbar,
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
        return () => {
            quillRef.current = undefined
            container.innerHTML = ''
        }
    }, [toolbar, quillRef])

    useEffect(() => {
        quillRef.current?.enable(editable)
    }, [editable, quillRef])

    useEffect(() => {
        quillRef.current?.updateContents(quillRef.current.getContents().diff(content), 'api')
    }, [content, quillRef])

    useEffect(() => {
        quillRef.current?.setSelection(selection, 'api')
    }, [selection, quillRef])

    return (
        <>
            <div ref={containerRef} style={containerStyle}></div>
            <DefaultStyle />
        </>
    )
}
