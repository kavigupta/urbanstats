import React, { CSSProperties, ReactNode, useCallback, useEffect, useRef, useState } from 'react'

import { TestUtils } from './TestUtils'
import { useMobileLayout } from './responsive'
import { zIndex } from './zIndex'

interface UndoRedoItem<T, S> {
    time: number
    state: T
    selection: S
}

export interface UndoRedoOptions {
    undoChunking?: number
    undoHistory?: number
    onlyElement?: { current: HTMLElement | null }
}

const logMessages: boolean = true

function debugUndo(arg: string): void {
    if (logMessages) {
        // eslint-disable-next-line no-console -- Conditionally logger
        console.log(arg)
    }
}

export function useUndoRedo<T, S>(
    initialState: T,
    initialSelection: S,
    onStateChange: (state: T) => void,
    onSelectionChange: (selection: S) => void,
    { undoChunking = 1000, undoHistory = 100, onlyElement }: UndoRedoOptions = {},
): {
        addState: (state: T, selection: S) => void
        updateCurrentSelection: (selection: S) => void
        updateCurrentState: (state: T) => void
        ui: ReactNode
        canUndo: boolean
        canRedo: boolean
    } {
    const undoStack = useRef<UndoRedoItem<T, S>[]>([
        { time: 0, state: initialState, selection: initialSelection },
    ])
    const redoStack = useRef<UndoRedoItem<T, S>[]>([])

    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)

    const addState = useCallback((state: T, selection: S): void => {
        const currentUndoState = undoStack.current[undoStack.current.length - 1]

        if (currentUndoState.time + undoChunking > Date.now()) {
            // Amend current item rather than making a new one
            currentUndoState.state = state
            currentUndoState.selection = selection

            debugUndo(`Updated undo stack tail`)
        }
        else {
            undoStack.current.push({ time: Date.now(), state, selection })
            while (undoStack.current.length > undoHistory) {
                undoStack.current.shift()
            }
            setCanUndo(true)
            debugUndo(`Pushed to undo stack. Length: ${undoStack.current.length}`)
        }
        redoStack.current = []
        setCanRedo(false)
    }, [undoChunking, undoHistory])

    const updateCurrentSelection = useCallback((selection: S): void => {
        undoStack.current[undoStack.current.length - 1].selection = selection
    }, [])

    const updateCurrentState = useCallback((state: T): void => {
        undoStack.current[undoStack.current.length - 1].state = state
    }, [])

    const doUndo = useCallback((): void => {
        if (undoStack.current.length >= 2) {
            const prevState = undoStack.current[undoStack.current.length - 2]
            // Prev state becomes current state, current state becomes redo state
            redoStack.current.push(undoStack.current.pop()!)
            onStateChange(prevState.state)
            onSelectionChange(prevState.selection)
            setCanRedo(true)
            setCanUndo(undoStack.current.length >= 2)
            debugUndo(`Undo completed, Undo Stack: ${undoStack.current.length}, Redo Stack: ${redoStack.current.length}`)
        }
        else {
            debugUndo(`Undo requested but stack is too short (${undoStack.current.length})`)
        }
    }, [onStateChange, onSelectionChange])

    const doRedo = useCallback((): void => {
        const futureState = redoStack.current.pop()
        if (futureState !== undefined) {
            undoStack.current.push(futureState)
            onStateChange(futureState.state)
            onSelectionChange(futureState.selection)
            setCanUndo(true)
            setCanRedo(redoStack.current.length >= 1)
            debugUndo(`Redo completed, Undo Stack: ${undoStack.current.length}, Redo Stack: ${redoStack.current.length}`)
        }
        else {
            debugUndo(`Redo requested but stack is too short (${redoStack.current.length})`)
        }
    }, [onStateChange, onSelectionChange])

    const getIsActive = useCallback(() => {
        return onlyElement === undefined || (document.activeElement !== null && document.activeElement === onlyElement.current)
    }, [onlyElement])

    // Set up keyboard shortcuts
    useEffect(() => {
        const listener = (e: KeyboardEvent): void => {
            if (!getIsActive()) {
                return
            }

            const isMac = navigator.userAgent.includes('Mac') && !TestUtils.shared.isTesting
            if (isMac ? e.key.toLowerCase() === 'z' && e.metaKey && !e.shiftKey : e.key.toLowerCase() === 'z' && e.ctrlKey) {
                e.preventDefault()
                doUndo()
            }
            else if (isMac ? e.key.toLowerCase() === 'z' && e.metaKey && e.shiftKey : e.key.toLowerCase() === 'y' && e.ctrlKey) {
                e.preventDefault()
                doRedo()
            }
        }

        window.addEventListener('keydown', listener)
        return () => { window.removeEventListener('keydown', listener) }
    }, [doUndo, doRedo, getIsActive])

    const [isActive, setIsActive] = useState(getIsActive)

    useEffect(() => {
        const listener = (): void => {
            setIsActive(getIsActive())
        }
        window.addEventListener('focusin', listener)
        window.addEventListener('focusout', listener)
        listener()
        return () => {
            window.removeEventListener('focusin', listener)
            window.removeEventListener('focusout', listener)
        }
    }, [getIsActive])

    const ui: ReactNode = isActive ? <UndoRedoControls {...{ doUndo, doRedo, canUndo, canRedo }} /> : null

    return {
        addState,
        updateCurrentSelection,
        updateCurrentState,
        ui,
        canUndo,
        canRedo,
    }
}

function UndoRedoControls({ doUndo, doRedo, canUndo, canRedo }: { doUndo: () => void, doRedo: () => void, canUndo: boolean, canRedo: boolean }): ReactNode {
    const outer = useRef<HTMLDivElement>(null)
    const inner = useRef<HTMLDivElement>(null)

    const width = 150
    const height = 50

    const padding = 10

    /**
     * iPhone safari is awful and ignores `position: fixed` when they keyboard is out
     * So we need to do manual positioning
     */
    const positionInner = useCallback(() => {
        // Get outer's position in the window
        // Position inner at an offset from outer that matches up with the current scroll position
        if (outer.current === null || inner.current === null) {
            return
        }

        const outerBounds = outer.current.getBoundingClientRect()

        const offsetParent = outer.current.offsetParent as HTMLElement

        inner.current.style.top = `${Math.min((window.visualViewport?.height ?? window.innerHeight) - outerBounds.top, (offsetParent.offsetHeight - outer.current.offsetTop)) - height}px`
        inner.current.style.left = `${Math.min((window.visualViewport?.width ?? window.innerWidth) - outerBounds.left, (offsetParent.offsetWidth - outer.current.offsetLeft)) - width}px`
    }, [])

    useEffect(positionInner, [positionInner])

    useEffect(() => {
        window.addEventListener('scroll', positionInner)
        window.addEventListener('resize', positionInner)
        window.visualViewport?.addEventListener('resize', positionInner)
        return () => {
            window.removeEventListener('scroll', positionInner)
            window.removeEventListener('resize', positionInner)
            window.visualViewport?.removeEventListener('resize', positionInner)
        }
    }, [positionInner])

    const isMobile = useMobileLayout()

    useEffect(() => {
        if (isMobile) {
            debugUndo(`canUndo=${canUndo}, canRedo=${canRedo}`)
        }
    }, [canUndo, canRedo, isMobile])

    if (!isMobile) {
        return null
    }

    const buttonStyle: CSSProperties = { flex: 1, touchAction: 'manipulation', zIndex: zIndex.mobileUndoRedoControls }

    return (
        <div ref={outer} style={{ position: 'absolute' }}>
            <div
                ref={inner}
                style={{
                    position: 'absolute',
                    display: 'flex',
                    width: `${width}px`,
                    height: `${height}px`,
                    gap: `${padding}px`,
                    padding: `${padding}px`,
                }}
            >
                <button
                    onPointerDown={(e) => {
                        debugUndo(`Got mobile undo touch`)
                        e.preventDefault()
                        doUndo()
                    }}
                    disabled={!canUndo}
                    style={buttonStyle}
                >
                    Undo
                </button>
                <button
                    onPointerDown={(e) => {
                        debugUndo(`Got mobile redo touch`)
                        e.preventDefault()
                        doRedo()
                    }}
                    disabled={!canRedo}
                    style={buttonStyle}
                >
                    Redo
                </button>
            </div>
        </div>
    )
}
