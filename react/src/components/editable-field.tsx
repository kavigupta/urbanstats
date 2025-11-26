import React, { CSSProperties, ReactNode, useRef, useState, useEffect, useCallback } from 'react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'

export function EditableString(props: { content: string, onNewContent: (content: string) => void, style: CSSProperties, inputMode: 'text' | 'decimal' }): ReactNode {
    /*
     * This code is weird because the `ContentEditable` needs to use refs.
     * See https://www.npmjs.com/package/react-contenteditable
     */
    const contentEditable: React.Ref<HTMLElement> = useRef(null)
    const html = useRef(props.content.toString())
    // these refs were added for entirely unrelated reasons, to do with fixing a bug where
    // props.content was not updating properly inside the handleSubmit function.
    const currentContentRef = useRef(props.content)
    const onNewContentRef = useRef(props.onNewContent)
    const [, setCounter] = useState(0)

    // Keep refs in sync with props
    useEffect(() => {
        html.current = props.content.toString()
        currentContentRef.current = props.content
        onNewContentRef.current = props.onNewContent
        setCounter(count => count + 1)
    }, [props.content, props.onNewContent])

    const handleChange = (evt: ContentEditableEvent): void => {
        html.current = evt.target.value
    }

    const handleSubmit = useCallback((): void => {
        const content = contentEditable.current!.innerText
        const oldContent = currentContentRef.current
        if (content !== oldContent) {
            onNewContentRef.current(content)
        }
    }, [])

    const selectAll = (): void => {
        setTimeout(() => {
            const range = document.createRange()
            range.selectNodeContents(contentEditable.current!)
            const selection = window.getSelection()
            selection?.removeAllRanges()
            selection?.addRange(range)
        }, 0)
    }

    return (
        <ContentEditable
            className="editable_content"
            style={props.style}
            innerRef={contentEditable}
            html={html.current}
            disabled={false}
            onChange={handleChange}
            onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') {
                    handleSubmit()
                    e.preventDefault()
                }
            }}
            onBlur={() => { handleSubmit () }}
            tagName="span" // Use a custom HTML tag (uses a div by default)
            inputMode={props.inputMode}
            onFocus={selectAll}
        />
    )
}

export function EditableNumber(props: { number: number, onNewNumber: (number: number) => void }): ReactNode {
    const onNewContent = useCallback((content: string): void => {
        const number = parseInt(content)
        if (!Number.isNaN(number) && number !== props.number) {
            props.onNewNumber(number)
        }
    }, [props])
    return (
        <EditableString
            content={props.number.toString()}
            onNewContent={onNewContent}
            style={{ minWidth: '2em', display: 'inline-block' }}
            inputMode="decimal"
        />
    )
}
