import katex from 'katex'
import { Scope } from 'parchment'
// eslint-disable-next-line import/no-named-as-default, import/default -- These don't like the import
import Quill, { Delta, EmitterSource, Range } from 'quill'
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
    strike: false,
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

        // https://github.com/slab/quill/issues/4306#issuecomment-2225999211
        const enterBinding: Quill['keyboard']['bindings'][string][number] = {
            key: 'Enter',
            handler: (range, context) => {
                const lineFormats = Object.keys(context.format).reduce(
                    (formats: Record<string, unknown>, format) => {
                        if (
                            quill.scroll.query(format, Scope.BLOCK)
                            && !Array.isArray(context.format[format])
                        ) {
                            formats[format] = context.format[format]
                        }
                        return formats
                    },
                    {},
                )

                const delta = new Delta()
                    .retain(range.index)
                    .delete(range.length)
                    .insert('\n', lineFormats)
                quill.updateContents(delta, Quill.sources.USER)
                quill.setSelection(range.index + 1, Quill.sources.SILENT)

                // NOTE: Changed from default handler!
                // Applies previous formats on the new line. This was dropped in
                // https://github.com/slab/quill/commit/ba5461634caa8e24641b687f2d1a8768abfec640
                Object.keys(context.format).forEach((name) => {
                    if (lineFormats[name]) return
                    if (Array.isArray(context.format[name])) return
                    if (name === 'code' || name === 'link') return
                    quill.format(
                        name,
                        context.format[name],
                        Quill.sources.USER,
                    )
                })

                quill.focus()
            },
        }

        const quill = new Quill(editorContainer, {
            theme: 'snow',
            modules: {
                history: {
                    maxStack: 0, // We use our own undo manager
                },
                toolbar: false,
                uploader: false,
                keyboard: {
                    bindings: {
                        handleEnter: enterBinding,
                    },
                },
            },
            placeholder: 'Enter text here...',
        })

        const originalFormat = quill.format.bind(quill)

        // Mock the format function and emit format update events
        quill.format = (name, value, source) => {
            const result = originalFormat(name, value, source)
            quill.emitter.emit('update-format')
            return result
        }

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
        const quill = quillRef.current
        if (quill === undefined) return
        if (quill.getSelection()?.index !== selection?.index || quill.getSelection()?.length !== selection?.length) {
            quill.setSelection(selection, 'api')
        }
    }, [selection, quillRef])

    return (
        <>
            <div ref={containerRef} style={containerStyle}></div>
            <DefaultStyle />
        </>
    )
}
