import React, { ReactNode, RefObject, useEffect, useRef } from 'react'
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
            // Must sanitize all html tags, including <br>
            props.setScript(editor.innerHTML.replace(/<.*?>/g, ''))
        }
        editor.addEventListener('input', listener)
        return () => { editor.removeEventListener('input', listener) }
    }, [props.setScript])

    return <InnerEditor editorRef={editorRef} />
}

// eslint-disable-next-line no-restricted-syntax -- Needs to be capitalized to work with JSX
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
