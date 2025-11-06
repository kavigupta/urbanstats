import { gzipSync } from 'zlib'

import React, { ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { CountsByUT } from '../../components/countsByArticleType'
import { Navigator } from '../../navigation/Navigator'
import { Colors } from '../../page_template/color-themes'
import { useColors } from '../../page_template/colors'
import { useSetting } from '../../page_template/settings'
import { PageTemplate } from '../../page_template/template'
import { Inset } from '../../urban-stats-script/constants/insets'
import { useUndoRedo } from '../../urban-stats-script/editor-utils'
import { unparse } from '../../urban-stats-script/parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { loadInsets } from '../../urban-stats-script/worker'
import { Property } from '../../utils/Property'
import { TestUtils } from '../../utils/TestUtils'
import { mixWithBackground } from '../../utils/color'
import { assert } from '../../utils/defensive'
import { useMobileLayout } from '../../utils/responsive'
import { defaultTypeEnvironment } from '../context'
import { MapGenerator, useMapGenerator } from '../map-generator'

import { ImportExportCode } from './ImportExportCode'
import { MapperSettings } from './MapperSettings'
import { Selection, SelectionContext } from './SelectionContext'
import { doEditInsets, getInsets, InsetEdits, replaceInsets, swapInsets } from './edit-insets-text-boxes'
import { MapSettings } from './utils'

type MapEditorMode = 'uss' | 'insets'

export function EditMapperPanel(props: { mapSettings: MapSettings, counts: CountsByUT }): ReactNode {
    const [mapSettings, setMapSettings] = useState(props.mapSettings)

    const [mapEditorMode, setMapEditorMode] = useState<MapEditorMode>('uss')

    const selectionContext = useMemo(() => new Property<Selection | undefined>(undefined), [])

    const undoRedo = useUndoRedo(
        mapSettings,
        selectionContext.value,
        setMapSettings,
        (selection) => {
            selectionContext.value = selection
        },
        {
            undoChunking: TestUtils.shared.isTesting ? 2000 : 1000,
            // Prevent keyboard shortcusts when in insets editing mode, since insets has its own undo stack
            onlyElement: mapEditorMode === 'insets' ? { current: null } : undefined,
        },
    )

    const { updateCurrentSelection, addState } = undoRedo

    const setMapSettingsWrapper = useCallback((newSettings: MapSettings): void => {
        setMapSettings(newSettings)
        addState(newSettings, selectionContext.value)
    }, [selectionContext, addState])

    const firstEffect = useRef(true)

    useEffect(() => {
        if (firstEffect.current) {
            // Otherwise we add an undo state immediately
            firstEffect.current = false
        }
        else {
            // So that map settings are updated when the prop changes
            setMapSettingsWrapper(props.mapSettings)
            setMapEditorMode('uss')
        }
    }, [props.mapSettings, setMapSettingsWrapper])

    const jsonedSettings = JSON.stringify({
        ...mapSettings,
        script: {
            uss: unparse(mapSettings.script.uss),
        },
    })

    const navContext = useContext(Navigator.Context)

    useEffect(() => {
        if (props.mapSettings !== mapSettings) {
            // gzip then base64 encode
            const encodedSettings = gzipSync(jsonedSettings).toString('base64')
            navContext.setMapperSettings(encodedSettings)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props.view won't be set except from the navigator
    }, [jsonedSettings, navContext])

    const typeEnvironment = useMemo(() => defaultTypeEnvironment(mapSettings.universe), [mapSettings.universe])

    // Update current selection when it changes
    useEffect(() => {
        const observer = (): void => {
            updateCurrentSelection(selectionContext.value)
        }

        selectionContext.observers.add(observer)
        return () => { selectionContext.observers.delete(observer) }
    }, [selectionContext, updateCurrentSelection])

    const mapGenerator = useMapGenerator({ mapSettings })

    const commonProps: CommonEditorProps = {
        mapSettings,
        setMapSettings: setMapSettingsWrapper,
        typeEnvironment,
        setMapEditorMode,
        mapGenerator,
    }

    return (
        <PageTemplate csvExportData={mapGenerator.exportCSV} showFooter={false}>
            <SelectionContext.Provider value={selectionContext}>
                {mapEditorMode === 'insets' ? <InsetsMapEditor {...commonProps} /> : <USSMapEditor {...commonProps} counts={props.counts} />}
                {mapEditorMode !== 'insets' ? undoRedo.ui : undefined /* Insets editor has its own undo stack */}
            </SelectionContext.Provider>
        </PageTemplate>
    )
}

interface CommonEditorProps {
    mapSettings: MapSettings
    setMapSettings: (s: MapSettings) => void
    typeEnvironment: TypeEnvironment
    setMapEditorMode: (m: MapEditorMode) => void
    mapGenerator: MapGenerator
}

function USSMapEditor({ mapSettings, setMapSettings, counts, typeEnvironment, setMapEditorMode, mapGenerator }: CommonEditorProps & { counts: CountsByUT }): ReactNode {
    const ui = mapGenerator.ui({ mode: 'uss' })

    return (
        <MaybeSplitLayout
            error={mapGenerator.errors.some(e => e.kind === 'error')}
            left={(
                <MapperSettings
                    mapSettings={mapSettings}
                    setMapSettings={setMapSettings}
                    errors={mapGenerator.errors}
                    counts={counts}
                    typeEnvironment={typeEnvironment}
                />
            )}
            right={(
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5em' }}>
                        <Export pngExport={ui.exportPng} geoJSONExport={mapGenerator.exportGeoJSON} />
                        {
                            getInsets(mapSettings, typeEnvironment) && (
                                <div style={{
                                    display: 'flex',
                                    gap: '0.5em',
                                    margin: '0.5em 0',
                                }}
                                >
                                    <button onClick={() => { setMapEditorMode('insets') }}>
                                        Edit Insets
                                    </button>
                                </div>
                            )
                        }
                        <ImportExportCode
                            mapSettings={mapSettings}
                            setMapSettings={setMapSettings}
                        />
                    </div>
                    {ui.node}
                </>
            )}
        />
    )
}

function MaybeSplitLayout({ left, right, error }: { left: ReactNode, right: ReactNode, error: boolean }): ReactNode {
    const mobileLayout = useMobileLayout()

    return mobileLayout
        ? (
                <>
                    {left}
                    {right}
                </>
            )
        : <SplitLayout error={error} left={left} right={right} />
}

function SplitLayout({ left, right, error }: { left: ReactNode, right: ReactNode, error: boolean }): ReactNode {
    const [height, setHeight] = useState(0)
    const splitRef = useRef<HTMLDivElement>(null)
    const colors = useColors()

    const updateHeight = useCallback(() => {
        if (splitRef.current) {
            const bounds = splitRef.current.getBoundingClientRect()
            setHeight(window.innerHeight - bounds.top - 8)
        }
    }, [])

    // This is ultimately the simplest way to set the height
    useLayoutEffect(() => {
        updateHeight()
        window.addEventListener('resize', updateHeight)
        return () => {
            window.removeEventListener('resize', updateHeight)
        }
    }, [updateHeight])

    const [leftColProp, setLeftColProp] = useSetting('mapperSettingsColumnProp')

    const [drag, setDrag] = useState<{ startOffsetX: number, pointerId: number, startProp: number } | undefined>(undefined)

    const dividerRef = useRef<HTMLDivElement>(null)

    const minLeftColProp = (): number =>
        minLeftWidth / splitRef.current!.offsetWidth

    useEffect(() => {
        if (dividerRef.current !== null) {
            dividerRef.current.style.cursor = leftColProp === minLeftColProp() ? 'e-resize' : (leftColProp === maxLeftColProp ? 'w-resize' : 'col-resize')
        }
    })

    const minLeftWidth = left ? 540 : 0
    const leftPct = left ? `${leftColProp * 100}%` : '0%'

    const maxLeftColProp = 0.5

    const dividerWidth = '1em'

    return (
        <div style={{ display: 'flex', height, position: 'relative' }} ref={splitRef}>
            {left && (
                <>
                    <div style={{ width: leftPct, minWidth: minLeftWidth, overflowY: 'scroll', backgroundColor: mixWithBackground(colors.hueColors.red, error ? 0.8 : 1, colors.slightlyDifferentBackground), padding: '1em', borderRadius: '5px' }}>
                        {left}
                    </div>
                    <div
                        ref={dividerRef}
                        style={{ width: dividerWidth, position: 'relative' }}
                        onPointerDown={(e) => {
                            if (drag === undefined) {
                                const div = e.target as HTMLDivElement
                                setDrag({
                                    pointerId: e.pointerId,
                                    startOffsetX: e.nativeEvent.offsetX + div.offsetLeft,
                                    startProp: Math.max(minLeftColProp(), leftColProp),
                                })
                                div.setPointerCapture(e.pointerId)
                            }
                        }}
                        onPointerMove={(e) => {
                            if (e.pointerId === drag?.pointerId) {
                                const div = e.target as HTMLDivElement
                                const propChange = (div.offsetLeft + e.nativeEvent.offsetX - drag.startOffsetX) / splitRef.current!.offsetWidth
                                setLeftColProp(Math.max(minLeftColProp(), Math.min(drag.startProp + propChange, maxLeftColProp)))
                            }
                        }}
                        onPointerCancel={(e) => {
                            if (drag?.pointerId === e.pointerId) {
                                setDrag(undefined)
                            }
                        }}
                        onPointerUp={(e) => {
                            if (drag?.pointerId === e.pointerId) {
                                setDrag(undefined)
                            }
                        }}
                    >
                        <div style={{
                            backgroundColor: colors.borderNonShadow,
                            borderRadius: '5px',
                            position: 'absolute',
                            width: '5px',
                            left: 'calc(50% - 2px)',
                            height: '50%',
                            top: '25%',
                            pointerEvents: 'none',
                        }}
                        />
                    </div>
                </>
            )}
            <div style={{ width: `calc(100% - max(${minLeftWidth}px, ${leftPct}) - ${dividerWidth})`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {right}
            </div>
        </div>
    )
}

function InsetsMapEditor({ mapSettings, setMapSettings, typeEnvironment, setMapEditorMode, mapGenerator }: CommonEditorProps): ReactNode {
    const colors = useColors()

    const [insetEdits, setInsetEdits] = useState<InsetEdits>({
        ast: a => a,
        insets: i => i,
    })

    const { addState, ui: undoRedoUi, canUndo } = useUndoRedo(insetEdits, undefined, setInsetEdits, () => undefined)

    const editedInsets = insetEdits.insets(getInsets(mapSettings, typeEnvironment)!)

    const addInsetEdit = (edits: InsetEdits): void => {
        setInsetEdits(edits)
        addState(edits, undefined)
    }

    const ui = mapGenerator.ui({
        mode: 'insets',
        editInsets: {
            add: () => {
                const newInset: Inset = {
                    ...loadInsets(mapSettings.universe ?? 'world')[0],
                    bottomLeft: [0.25, 0.25],
                    topRight: [0.75, 0.75],
                    mainMap: false,
                }
                addInsetEdit(replaceInsets(insetEdits, [editedInsets.length, editedInsets.length], [offsetInsetInBounds(newInset, editedInsets)]))
            },
            modify: (i, e) => {
                addInsetEdit(replaceInsets(insetEdits, [i, i + 1], [{ ...editedInsets[i], ...e }]))
            },
            delete: (i) => {
                addInsetEdit(replaceInsets(insetEdits, [i, i + 1], []))
            },
            duplicate: (i) => {
                addInsetEdit(replaceInsets(insetEdits, [i + 1, i + 1], [offsetInsetInBounds(editedInsets[i], editedInsets)]))
            },
            moveUp: (i) => {
                assert(i + 1 < editedInsets.length, `Cannot move inset ${i} up, already top`)
                addInsetEdit(swapInsets(insetEdits, i, i + 1))
            },
            moveDown: (i) => {
                assert(i > 0, `Cannot move inset ${i} down, already bottom`)
                addInsetEdit(swapInsets(insetEdits, i, i - 1))
            },
            edited: editedInsets,
        },
    })

    return (
        <>
            <MaybeSplitLayout
                left={undefined}
                error={false}
                right={(
                    <>
                        <div style={{
                            backgroundColor: colors.slightlyDifferentBackgroundFocused,
                            borderRadius: '5px',
                            padding: '10px',
                            margin: '10px 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '0.5em',
                        }}
                        >
                            <div>
                                <b>Editing Insets.</b>
                                {' '}
                                Pans and zooms to maps will be reflected permanently. Drag inset frames to reposition and resize.
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>

                                <button onClick={() => { setMapEditorMode('uss') }}>
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setMapSettings({ ...mapSettings, script: { uss: doEditInsets(mapSettings, insetEdits, typeEnvironment) } })
                                        setMapEditorMode('uss')
                                    }}
                                    disabled={!canUndo}
                                >
                                    Accept
                                </button>
                            </div>
                        </div>
                        {ui.node}
                    </>
                )}
            />
            {undoRedoUi}
        </>
    )
}

function moveInset(inset: Inset, x: number, y: number): Inset {
    return {
        ...inset,
        bottomLeft: [inset.bottomLeft[0] + x, inset.bottomLeft[1] + y],
        topRight: [inset.topRight[0] + x, inset.topRight[1] + y],
    }
}

function inBounds(inset: Inset): boolean {
    return inset.bottomLeft.concat(inset.topRight).every(c => c >= 0 && c <= 1)
}

function samePosition(a: Inset, b: Inset): boolean {
    return a.bottomLeft[0] === b.bottomLeft[0] && a.bottomLeft[1] === b.bottomLeft[1] && a.topRight[0] === b.topRight[0] && a.topRight[1] === b.topRight[1]
}

function offsetInsetInBounds(inset: Inset, exclude: Inset[]): Inset {
    for (let delta = 0; delta < 1; delta += 0.05) {
        for (const [x, y] of [[delta, delta], [-delta, -delta], [-delta, delta], [delta, -delta]]) {
            const newInset = moveInset(inset, x, y)
            if (inBounds(newInset) && !exclude.some(i => samePosition(newInset, i))) {
                return newInset
            }
        }
    }
    return inset
}

function saveAsFile(filename: string, data: string | Blob, type: string): void {
    const blob = typeof data === 'string' ? new Blob([data], { type }) : data
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

function Export(props: { pngExport?: (colors: Colors) => Promise<string>, geoJSONExport?: () => string }): ReactNode {
    const colors = useColors()

    const doPngExport = async (): Promise<void> => {
        if (props.pngExport === undefined) {
            return
        }
        const pngDataUrl = await props.pngExport(colors)
        const data = await fetch(pngDataUrl)
        const pngData = await data.blob()
        saveAsFile('map.png', pngData, 'image/png')
    }

    const doGeoJSONExport = (): void => {
        if (props.geoJSONExport === undefined) {
            return
        }
        saveAsFile('map.geojson', props.geoJSONExport(), 'application/geo+json')
    }

    return (
        <div style={{
            display: 'flex',
            gap: '0.5em',
            margin: '0.5em 0',
        }}
        >
            <button
                disabled={props.pngExport === undefined}
                onClick={() => {
                    void doPngExport()
                }}
            >
                Export as PNG
            </button>
            <button
                disabled={props.geoJSONExport === undefined}
                onClick={() => {
                    doGeoJSONExport()
                }}
            >
                Export as GeoJSON
            </button>
            <button onClick={() => {
                // eslint-disable-next-line no-restricted-syntax -- We're opening a new window here
                const params = new URLSearchParams(window.location.search)
                params.set('view', 'true')
                // navigate to the page in a new tab
                window.open(`?${params.toString()}`, '_blank')
            }}
            >
                View as Zoomable Page
            </button>
        </div>
    )
}
