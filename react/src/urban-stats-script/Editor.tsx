import React, { ReactNode, RefObject, useEffect, useRef } from 'react'
import './uss.css'

export function Editor(props: { script: string, setScript: (script: string) => void }): ReactNode {
    const editorRef = useRef<HTMLPreElement>(null)

    useEffect(() => {
        const editor = editorRef.current!
        const newScript = stringToHtml(props.script)
        if (editor.innerHTML !== newScript) {
            editor.innerHTML = newScript
        }
    }, [props.script])

    useEffect(() => {
        const editor = editorRef.current!
        const listener = (): void => {
            props.setScript(htmlToString(editor.innerHTML))
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

function htmlToString(html: string): string {
    const domParser = new DOMParser()
    const string = html
        .replaceAll(/<.*?>/g, '')
        .split('\n')
        .map(line => domParser.parseFromString(line, 'text/html').documentElement.textContent)
        .join('\n')
    console.log({ html, string })
    return string
}

function stringToHtml(string: string): string {
    if (string === '') {
        return '<br>'
    }
    const html = string
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll('\'', '&#039;')
    console.log({ string, html })
    return html
}
