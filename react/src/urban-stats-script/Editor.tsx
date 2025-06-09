import React, { ReactNode, RefObject, useEffect, useMemo, useRef } from 'react'
import './uss.css'

export function Editor(props: { script: string, setScript: (script: string) => void }): ReactNode {
    const editorRef = useRef<HTMLPreElement>(null)

    useEffect(() => {
        const editor = editorRef.current!
        const newScript = props.script === '' ? '<br>' : props.script
        if (editor.innerHTML !== newScript) {
            editor.innerHTML = newScript
        }
    }, [props.script])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (): void => {
            // Must sanitize all html tags
            props.setScript(editor.innerHTML.replace(/<.*?>/g, ''))
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [props.setScript])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (e: KeyboardEvent): void => {
            const getSel = (): Selection => {
                const doc = editor.ownerDocument.defaultView!
                return doc.getSelection()!
            }

            if (e.key === 'Tab') { // tab key
                e.preventDefault() // this will prevent us from tabbing out of the editor

                const sel = getSel()
                const range = sel.getRangeAt(0)

                if (range.collapsed) {
                    if (range.startContainer instanceof HTMLPreElement) {
                        range.startContainer.querySelector('br')?.remove()
                    }

                    const tabNode = document.createTextNode('    ')
                    range.insertNode(tabNode)

                    range.setStart(tabNode, 4)
                    range.setEnd(tabNode, 4)
                    sel.removeAllRanges()
                    sel.addRange(range)
                }
            }

            else if (e.key === 'Backspace') {
                const sel = getSel()
                const range = sel.getRangeAt(0)
                if (range.collapsed) {
                    const node = range.startContainer
                    const offset = range.startOffset

                    if (node.nodeType === Node.TEXT_NODE) {
                        const text = node.textContent ?? ''
                        console.log({ offset, text: text.slice(offset - 4, offset) })
                        if (offset >= 4 && text.slice(offset - 4, offset) === '    ') {
                            // Remove the 4 spaces
                            const newText = text.slice(0, offset - 4) + text.slice(offset)
                            node.textContent = newText
                            // Move caret back 4 positions
                            range.setStart(node, offset - 4)
                            range.setEnd(node, offset - 4)
                            sel.removeAllRanges()
                            sel.addRange(range)
                            e.preventDefault()
                        }
                    }
                }
            }
        }
        editor.addEventListener('keydown', listener)
        return () => { editor.removeEventListener('keydown', listener) }
    }, [])

    return <InnerEditor editorRef={editorRef} />
}

const InnerEditor = React.memo(function InnerEditor(props: { editorRef: RefObject<HTMLPreElement> }) {
    return (
        <pre
            className="ussEditor"
            ref={props.editorRef}
            contentEditable="plaintext-only"
            dangerouslySetInnerHTML={{ __html: '' }}
        />
    )
})
