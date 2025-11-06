import katex from 'katex'
// eslint-disable-next-line import/no-named-as-default, import/default -- These don't like the import
import Quill, { Delta, EmitterSource, Range } from 'quill'
import Block from 'quill/blots/block'
import React, { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef } from 'react'

import 'katex/dist/katex.css'
import 'quill/dist/quill.snow.css'
import { colorThemes } from '../page_template/color-themes'
import { doRender, hexToColor } from '../urban-stats-script/constants/color-utils'
import { RichTextSegment } from '../urban-stats-script/constants/rich-text'
import { RemoveOptionals } from '../utils/types'

// Needed for formula module
(window as { katex: unknown }).katex = katex

export const defaultAttributes: RemoveOptionals<RichTextSegment>['attributes'] = {
    size: 16,
    font: 'Jost',
    color: hexToColor(colorThemes['Light Mode'].textMain),
    bold: false,
    italic: false,
    underline: false,
    list: '',
    indent: 0,
    align: '',
}

const defaultStyle = `font-family: ${defaultAttributes.font};
    font-size: ${defaultAttributes.size}px;
    color: ${doRender(defaultAttributes.color)};`

function DefaultStyle(): ReactNode {
    return (
        <style>
            {`
.ql-editor {
    ${defaultStyle}
}
.ql-container.ql-snow { border: none; }
.ql-toolbar.ql-snow { border: none; }
.ql-editor li[data-list=bullet] > .ql-ui:before {
    content: '●';
}
`}
        </style>
    )
}

// Sets the default style
class DefaultBlock extends Block {
    static override create(): HTMLElement {
        const node = super.create()
        node.setAttribute('style', defaultStyle) // Example customization
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
    quillRef: React.MutableRefObject<Quill | undefined>
}

export function QuillEditor({ editable, content, selection, onTextChange, onSelectionChange, containerStyle, quillRef }: QuillEditorProps): ReactNode {
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
                toolbar: false,
                uploader: false,
            },
            placeholder: 'Enter text here...',
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
    }, [quillRef])

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
