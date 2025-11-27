import stableStringify from 'json-stable-stringify'
import React, { useRef, useState, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { useStyleElement } from '../page_template/colors'

// eslint-disable-next-line no-restricted-syntax -- Forward ref
export const IFrameInput = React.forwardRef(IFrameInputRef)

// A Drop In replacement for a normal input,
// except allows selection to persist in the parent window by rendering the input in an iframe (which is technically another page)
function IFrameInputRef(props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, ref: React.ForwardedRef<HTMLInputElement>): ReactNode {
    const frameRef = useRef<HTMLIFrameElement>(null)
    const [frameDoc, setFrameDoc] = useState<Document | undefined>()

    useEffect(() => {
        const doc = frameRef.current!.contentWindow!.document
        for (const style of Array.from(document.head.querySelectorAll('style'))) {
            doc.head.appendChild(style.cloneNode(true))
        }
        setFrameDoc(doc)
    }, [])

    const styleElement = useStyleElement()

    useEffect(() => {
        const doc = frameRef.current!.contentWindow!.document

        styleElement(doc.documentElement)
        doc.body.style.margin = '0px'
        doc.body.style.backgroundColor = 'transparent'
    }, [styleElement])

    const [frame, setFrame] = useState({ left: 0, top: 0, width: 0, height: 0 })

    const layoutInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const layoutInput = layoutInputRef.current!
        const updateFrame = (): void => {
            setFrame((f) => {
                const newFrame = { left: layoutInput.offsetLeft, top: layoutInput.offsetTop, width: layoutInput.offsetWidth, height: layoutInput.offsetHeight }
                if (stableStringify(f) === stableStringify(newFrame)) {
                    return f
                }
                return newFrame
            })
        }
        updateFrame()
        const resizeObserver = new ResizeObserver(updateFrame)
        let ancestor: HTMLElement | null = layoutInput
        while (ancestor !== null) {
            resizeObserver.observe(ancestor)
            ancestor = ancestor.parentElement
        }
        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    return (
        <>
            <input ref={layoutInputRef} {...props} style={{ ...props.style, visibility: 'hidden' }} />
            <iframe
                ref={frameRef}
                style={{
                    border: 'none',
                    position: 'absolute',
                    ...frame,
                }}
            >
                {frameDoc && createPortal(<input ref={ref} {...props} style={{ ...props.style, width: '100%', height: '100%' }} />, frameDoc.body)}
            </iframe>
        </>
    )
}
