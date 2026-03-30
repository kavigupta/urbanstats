import assert from 'assert'

import React, { ReactNode, useContext, useEffect, useRef } from 'react'

import { DefaultMap } from './DefaultMap'

type TextAreaContextMap = DefaultMap<string, Set<(newHeight: number) => void>>

// Used to sync textarea heights even among inert textareas (so that collapse size is correct)
const textAreaSizeContext = React.createContext<TextAreaContextMap | undefined>(undefined)

export function TextAreaSizeContextProvider({ children }: { children: ReactNode }): ReactNode {
    const map = useRef<TextAreaContextMap>(new DefaultMap(() => new Set()))
    return (
        <textAreaSizeContext.Provider value={map.current}>
            {children}
        </textAreaSizeContext.Provider>
    )
}

// Syncs text area height to others with the same identifier
export function useTextAreaSizeSync(textAreaRef: React.RefObject<HTMLTextAreaElement>, identifier: string): void {
    const sizeContext = useContext(textAreaSizeContext)
    assert(sizeContext !== undefined, 'Missing textAreaSizeContext')

    useEffect(() => {
        assert(textAreaRef.current !== null, 'text area ref not assigned')
        const textArea = textAreaRef.current

        let ignore = 0

        const myCallback = (newHeight: number): void => {
            ignore++
            textArea.style.height = `${newHeight}px`
        }

        const resizeObserver = new ResizeObserver(() => {
            if (ignore > 0) {
                ignore--
                return
            }
            const height = textArea.offsetHeight
            // prevent the browser from firing a warning... we prevent recursion via ignore
            requestAnimationFrame(() => {
                for (const callback of sizeContext.get(identifier)) {
                    if (callback !== myCallback) {
                        callback(height)
                    }
                }
            })
        })
        resizeObserver.observe(textArea)
        sizeContext.get(identifier).add(myCallback)

        return () => {
            resizeObserver.disconnect()
            sizeContext.get(identifier).delete(myCallback)
        }
    }, [identifier, sizeContext, textAreaRef])
}
