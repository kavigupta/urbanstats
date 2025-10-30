import React, { useRef, useState, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'

// A Drop In replacement for a normal input,
// except allows selection to persist in the parent window by rendering the input in an iframe (which is technically another page)
export function IFrameInput(props: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>): ReactNode {
    const frameRef = useRef<HTMLIFrameElement>(null)
    const [frameDoc, setFrameDoc] = useState<Document | undefined>()

    useEffect(() => {
        const doc = frameRef.current!.contentWindow!.document
        for (const style of Array.from(document.head.querySelectorAll('style'))) {
            doc.head.appendChild(style.cloneNode(true))
        }

        doc.documentElement.style.cssText = document.documentElement.style.cssText

        doc.body.style.cssText = document.body.style.cssText
        doc.body.style.margin = '0px'
        doc.body.style.backgroundColor = 'transparent'
        setFrameDoc(doc)
    }, [])

    const [frame, setFrame] = useState({ left: 0, top: 0, width: 0, height: 0 })

    const layoutInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const layoutInput = layoutInputRef.current!
        const updateFrame = (): void => {
            setFrame({ left: layoutInput.offsetLeft, top: layoutInput.offsetTop, width: layoutInput.offsetWidth, height: layoutInput.offsetHeight })
        }
        updateFrame()
        const observer = new IntersectionObserver(updateFrame)
        observer.observe(layoutInput)
        return () => {
            observer.disconnect()
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
                {frameDoc && createPortal(<input {...props} style={{ ...props.style, width: '100%', height: '100%' }} />, frameDoc.body)}
            </iframe>
        </>
    )
}
