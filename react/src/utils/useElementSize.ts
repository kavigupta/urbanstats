import { RefObject, useLayoutEffect, useState } from 'react'

/** Measured before paint, so the first render already has the element's size */
export function useElementSize(ref: RefObject<HTMLElement>): { width: number, height: number } {
    const [size, setSize] = useState({ width: 0, height: 0 })
    useLayoutEffect(() => {
        const element = ref.current!
        const measure = (): void => {
            setSize({ width: element.clientWidth, height: element.clientHeight })
        }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => {
            observer.disconnect()
        }
    }, [ref])
    return size
}
