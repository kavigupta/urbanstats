import katex from 'katex'
// eslint-disable-next-line import/no-named-as-default, import/default -- These don't like the import
import Quill, { Delta, EmitterSource, Parchment, Range } from 'quill'
import Block from 'quill/blots/block'
import React, { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'

import 'katex/dist/katex.css'
import 'quill/dist/quill.snow.css'
import { createPortal } from 'react-dom'

// Needed for formula module
(window as { katex: unknown }).katex = katex

const fonts = [
    { family: 'jost' },
    { family: 'times new roman', displaySize: 10 },
]

const fontAttributor = Quill.import('attributors/style/font') as Parchment.Attributor
fontAttributor.whitelist = fonts.map(f => f.family)
Quill.register(fontAttributor, true)

function FontStyles(): ReactNode {
    return (
        <style>
            {fonts.map(({ family, displaySize }) => {
                const capitalizedFont = family.replaceAll(/\b\w/g, char => char.toUpperCase())
                return `/* Set dropdown font-families */
.ql-snow .ql-picker.ql-font .ql-picker-label[data-value="${family}"]::before,
.ql-snow .ql-picker.ql-font .ql-picker-item[data-value="${family}"]::before{
  font-family: "${family}";
  content: "${capitalizedFont}";
  ${displaySize !== undefined ? `font-size: ${displaySize}px;` : ''}
}
/* Set effect font-families */
.ql-font-${family} {
  font-family: "${family}";
}`
            })}
        </style>
    )
}

const sizeAttributor = Quill.import('attributors/style/size') as Parchment.Attributor
sizeAttributor.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '30px', '36px', '48px', '72px', '96px']
Quill.register(sizeAttributor, true)

function SizeStyles(): ReactNode {
    return (
        <style>
            {['size', 'borderWidth'].map(control => `.ql-snow .ql-picker.ql-${control} .ql-picker-label[data-value]::before,
.ql-snow .ql-picker.ql-${control} .ql-picker-item[data-value]::before {
  content: attr(data-value) !important;
}
.ql-picker.ql-${control} { width: 60px !important }`)}
        </style>
    )
}

function DefaultStyle(): ReactNode {
    return (
        <style>
            {` .ql-editor { font-family: jost; font-size: 16px; }`}
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
    backgroundColor?: string
    border?: { color: string, width: number }
    customControls?: ReactNode
}

export function QuillEditor({ editable, content, selection, onTextChange, onSelectionChange, containerStyle, backgroundColor, border, customControls }: QuillEditorProps): ReactNode {
    const quillRef = useRef<Quill>()

    const containerRef = useRef<HTMLDivElement>(null)
    const onTextChangeRef = useRef(onTextChange)
    const onSelectionChangeRef = useRef(onSelectionChange)

    const [customControlsContainer, setCustomControlsContainer] = useState<Element | null>(null)

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
                toolbar: editable && {
                    container: [
                        [{ font: fontAttributor.whitelist }, { size: sizeAttributor.whitelist }],

                        ['bold', 'italic', 'underline', 'strike'], // toggled buttons

                        [{ align: [] }],
                        [{ color: [] }, { background: [] }], // dropdown with defaults from theme

                        ['link', 'image', 'formula'],

                        [], // This is a reference point to put custom controls
                        [{ borderWidth: ['0px', '1px', '2px', '3px', '4px', '5px'] }],
                    ],
                    handlers: {
                        borderWidth: (width: string) => {
                            console.log(Number(width.slice(0, width.length - 2)))
                        },
                    },
                },
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

        setCustomControlsContainer(container.querySelector('.ql-formats:not(:has(*))'))

        return () => {
            quillRef.current = undefined
            container.innerHTML = ''
            setCustomControlsContainer(null)
        }
    }, [editable])

    useEffect(() => {
        quillRef.current?.updateContents(quillRef.current.getContents().diff(content), 'api')
    }, [content])

    useEffect(() => {
        quillRef.current?.setSelection(selection, 'api')
    }, [selection])

    useEffect(() => {
        const editor = containerRef.current?.querySelector<HTMLDivElement>('.ql-editor')
        if (editor) {
            editor.style.backgroundColor = backgroundColor ?? ''
        }
        const toolbar = containerRef.current?.querySelector<HTMLDivElement>('.ql-toolbar')
        if (toolbar) {
            toolbar.style.backgroundColor = backgroundColor ? `${backgroundColor}aa` : ''
        }
        const container = containerRef.current?.querySelector<HTMLDivElement>('.ql-container')
        if (container) {
            container.style.border = border ? `${border.width}px solid ${border.color}` : ''
        }
    })

    return (
        <>
            <div ref={containerRef} style={containerStyle}></div>
            <FontStyles />
            <SizeStyles />
            <DefaultStyle />
            {customControlsContainer ? createPortal(customControls, customControlsContainer) : null}
        </>
    )
}
