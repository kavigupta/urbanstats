import React, { ReactNode, RefObject, useLayoutEffect, useRef, useState } from 'react'

export function RenderTwiceHidden<T extends HTMLElement>({ children }: { children: (arg: { kind: 'visible', height: number } | { kind: 'hidden', ref: RefObject<T> }) => ReactNode }): ReactNode {
    const [height, setHeight] = useState(10000)
    const hiddenRef = useRef<T>(null)
    useLayoutEffect(() => {
        let zoom = 1
        // For testing, since we use CSS zoom
        if ('currentCSSZoom' in hiddenRef.current! && typeof hiddenRef.current.currentCSSZoom === 'number') {
            zoom = hiddenRef.current.currentCSSZoom
        }
        const resizeObserver = new ResizeObserver(() => {
            setHeight(hiddenRef.current!.getBoundingClientRect().height / zoom)
        })
        resizeObserver.observe(hiddenRef.current!)
        setHeight(hiddenRef.current!.getBoundingClientRect().height / zoom)
        return () => { resizeObserver.disconnect() }
    }, [])
    return (
        <>
            {children({ kind: 'hidden', ref: hiddenRef })}
            {children({ kind: 'visible', height })}
        </>
    )
}
