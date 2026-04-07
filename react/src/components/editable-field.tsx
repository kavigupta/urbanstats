import React, { CSSProperties, ReactNode, useRef } from 'react'
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable'

import { useColors } from '../page_template/colors'

export function EditableString(props: { content: string, onNewContent: (content: string) => void, style: CSSProperties, inputMode: 'text' | 'decimal' }): ReactNode {
    /*
     * This code is weird because the `ContentEditable` needs to use refs.
     * See https://www.npmjs.com/package/react-contenteditable
     */
    const contentEditable: React.Ref<HTMLElement> = useRef(null)
    const html = useRef(props.content.toString())
    // https://github.com/lovasoa/react-contenteditable/issues/161
    const propsRef = useRef(props)
    propsRef.current = props

    // Otherwise, this component can display the wrong number when props change
    // This cannot be an effect, as the delay causes rendering problems (such as jumping, scroll position issues)
    const previousContent = useRef(props.content)
    if (props.content !== previousContent.current) {
        html.current = props.content.toString()
    }
    previousContent.current = props.content

    const handleChange = (evt: ContentEditableEvent): void => {
        html.current = evt.target.value
    }

    const handleSubmit = (): void => {
        const content = contentEditable.current!.innerText
        if (content !== propsRef.current.content) {
            propsRef.current.onNewContent(content)
        }
    }

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
            onBlur={handleSubmit}
            tagName="span" // Use a custom HTML tag (uses a div by default)
            inputMode={props.inputMode}
            onFocus={selectAll}
        />
    )
}

export function EditableNumber(props: { number: number, onNewNumber: (number: number) => void }): ReactNode {
    const colors = useColors()
    const onNewContent = (content: string): void => {
        const number = parseInt(content)
        if (!Number.isNaN(number) && number !== props.number) {
            props.onNewNumber(number)
        }
    }
    return (
        <EditableString
            content={props.number.toString()}
            onNewContent={onNewContent}
            style={{ minWidth: '2em', display: 'inline-block', border: `1px solid ${colors.borderNonShadow}`, borderRadius: 3, padding: '0 2px' }}
            inputMode="decimal"
        />
    )
}
