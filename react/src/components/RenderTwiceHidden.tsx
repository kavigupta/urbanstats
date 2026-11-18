import React, { ReactNode, RefObject, useLayoutEffect, useRef, useState } from 'react'

/**
 * Utility component that renders its child twice, once "hidden" and once "visible".
 *
 * The height of the "hidden" ref is then passed to the visible render pass.
 *
 * The actual styling to make things "hidden" and "visible" is up to the user of the component.
 *
 * This component is usually used to calculate sizes for animations.
 */
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
