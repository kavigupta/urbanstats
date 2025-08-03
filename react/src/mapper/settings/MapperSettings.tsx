import React, { ReactNode, useEffect, useMemo, useRef } from 'react'

import valid_geographies from '../../data/mapper/used_geographies'
import universes_ordered from '../../data/universes_ordered'
import { EditorError } from '../../urban-stats-script/editor-utils'
import { Property } from '../../utils/Property'
import { DataListSelector } from '../DataListSelector'
import { defaultTypeEnvironment } from '../context'

import { Selection, SelectionContext } from './SelectionContext'
import { TopLevelEditor } from './TopLevelEditor'
import { MapSettings } from './utils'

interface UndoRedoItem { time: number, uss: MapSettings['script']['uss'], selection: Selection | undefined }

const undoChunking = 1000
const undoHistory = 100

export function MapperSettings({ mapSettings, setMapSettings, errors }: {
    mapSettings: MapSettings
    setMapSettings: (setter: (existing: MapSettings) => MapSettings) => void
    errors: EditorError[]
}): ReactNode {
    const uss = mapSettings.script.uss
    const setUss = (newUss: MapSettings['script']['uss']): void => {
        setMapSettings(s => ({
            ...s,
            script: { uss: newUss },
        }))
    }

    const selectionContext = useMemo(() => new Property<Selection | undefined>(undefined), [])

    useEffect(() => {
        const observer = (): void => {
            undoStack.current[undoStack.current.length - 1].selection = selectionContext.value
        }

        selectionContext.observers.add(observer)
        return () => { selectionContext.observers.delete(observer) }
    }, [selectionContext])

    const undoStack = useRef<UndoRedoItem[]>([{ time: Date.now(), uss, selection: selectionContext.value }])
    const redoStack = useRef<UndoRedoItem[]>([])

    useEffect(() => {
        const listener = (e: KeyboardEvent): void => {
            const isMac = navigator.userAgent.includes('Mac')
            if (isMac ? e.key === 'z' && e.metaKey && !e.shiftKey : e.key === 'z' && e.ctrlKey) {
                e.preventDefault()
                // Undo
                if (undoStack.current.length >= 2) {
                    const prevState = undoStack.current[undoStack.current.length - 2]
                    // Prev state becomes current state, current state becomes redo state
                    redoStack.current.push(undoStack.current.pop()!)
                    setUss(prevState.uss)
                    selectionContext.value = prevState.selection
                }
            }
            else if (isMac ? e.key === 'z' && e.metaKey && e.shiftKey : e.key === 'y' && e.ctrlKey) {
                e.preventDefault()
                // Redo
                const futureState = redoStack.current.pop()
                if (futureState !== undefined) {
                    undoStack.current.push(futureState)
                    setUss(futureState.uss)
                    selectionContext.value = futureState.selection
                }
            }
        }
        window.addEventListener('keydown', listener)
        return () => { window.removeEventListener('keydown', listener) }
    })

    return (
        <SelectionContext.Provider value={selectionContext}>
            <DataListSelector
                overallName="Universe:"
                names={universes_ordered}
                initialValue={mapSettings.universe}
                onChange={
                    (name) => {
                        setMapSettings(s => ({
                            ...s,
                            universe: name,
                        }))
                    }
                }
            />
            <DataListSelector
                overallName="Geography Kind:"
                names={valid_geographies}
                initialValue={mapSettings.geographyKind}
                onChange={
                    (name) => {
                        setMapSettings(s => ({
                            ...s,
                            geographyKind: name,
                        }))
                    }
                }
            />
            <TopLevelEditor
                uss={uss}
                setUss={(newUss) => {
                    setUss(newUss)

                    const currentUndoState = undoStack.current[undoStack.current.length - 1]
                    if (currentUndoState.time + undoChunking > Date.now()) {
                        // ammend current item rather than making a new one
                        currentUndoState.uss = newUss
                        currentUndoState.selection = selectionContext.value
                    }
                    else {
                        undoStack.current.push({ time: Date.now(), uss: newUss, selection: selectionContext.value })
                        while (undoStack.current.length > undoHistory) {
                            undoStack.current.shift()
                        }
                    }
                    redoStack.current = []
                }}
                typeEnvironment={defaultTypeEnvironment(mapSettings.universe)}
                errors={errors}
            />
        </SelectionContext.Provider>
    )
}
