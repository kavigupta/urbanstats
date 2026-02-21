import { gzipSync } from 'zlib'

import React, { ReactNode, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { CountsByUT } from '../../components/countsByArticleType'
import universes_ordered from '../../data/universes_ordered'
import { Navigator } from '../../navigation/Navigator'
import { useColors } from '../../page_template/colors'
import { useSetting } from '../../page_template/settings'
import { PageTemplate } from '../../page_template/template'
import { universeContext } from '../../universe'
import { Inset } from '../../urban-stats-script/constants/insets'
import { documentLength } from '../../urban-stats-script/constants/rich-text'
import { defaults, TextBox } from '../../urban-stats-script/constants/text-box'
import { useUndoRedo } from '../../urban-stats-script/editor-utils'
import { unparse } from '../../urban-stats-script/parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { Property } from '../../utils/Property'
import { TestUtils } from '../../utils/TestUtils'
import { mixWithBackground } from '../../utils/color'
import { assert } from '../../utils/defensive'
import { mapperToTable } from '../../utils/page-conversion'
import { useMobileLayout } from '../../utils/responsive'
import { saveAsFile } from '../../utils/saveAsFile'
import { Selection as TextBoxesSelection, SelectionContext as TextBoxesSelectionContext } from '../components/MapTextBox'
import { defaultTypeEnvironment, loadInsets } from '../context'
import { MapGenerator, useMapGenerator } from '../map-generator'

import { ImportExportCode } from './ImportExportCode'
import { mapSettingsContext } from './MapSettingsContext'
import { MapperSettings } from './MapperSettings'
import { Selection, SelectionContext } from './SelectionContext'
import { doEditInsets, getInsets, InsetEdits, replaceInsets, swapInsets } from './edit-insets'
import { getTextBoxes, scriptWithNewTextBoxes } from './edit-text-boxes'
import { validMapperOutputs } from './map-uss'
import { MapEditorMode, MapSettings } from './utils'

export interface ActionOptions { undoable?: boolean, updateMap?: boolean }

export function EditMapperPanel(props: { mapSettings: MapSettings, counts: CountsByUT }): ReactNode {
    const [mapSettings, setMapSettings] = useState(props.mapSettings)
    const [generatorMapSettings, setGeneratorMapSettings] = useState(props.mapSettings)

    const setAllMapSettings = useCallback((newSettings: MapSettings) => {
        setMapSettings(newSettings)
        setGeneratorMapSettings(newSettings)
    }, [])

    const [mapEditorMode, setMapEditorMode] = useState<MapEditorMode>('uss')

    const selectionContext = useMemo(() => new Property<Selection | undefined>(undefined), [])

    const undoRedo = useUndoRedo(
        mapSettings,
        selectionContext.value,
        setAllMapSettings,
        (selection) => {
            selectionContext.value = selection
        },
        {
            undoChunking: TestUtils.shared.isTesting ? 2000 : 1000,
            // Prevent keyboard shortcusts when in insets editing mode, since insets has its own undo stack
            onlyElement: mapEditorMode !== 'uss' ? { current: null } : undefined,
        },
    )

    const { updateCurrentSelection, addState, updateCurrentState } = undoRedo

    const setMapSettingsWrapper = useCallback((newSettings: MapSettings, actionOptions: ActionOptions): void => {
        if (actionOptions.updateMap === false) {
            setMapSettings(newSettings)
        }
        else {
            setAllMapSettings(newSettings)
        }
        if (actionOptions.undoable === false) {
            updateCurrentState(newSettings)
        }
        else {
            addState(newSettings, selectionContext.value)
        }
    }, [selectionContext, addState, updateCurrentState, setAllMapSettings])

    const firstEffect = useRef(true)

    useEffect(() => {
        if (firstEffect.current) {
            // Otherwise we add an undo state immediately
            firstEffect.current = false
        }
        else {
            // So that map settings are updated when the prop changes
            setMapSettingsWrapper(props.mapSettings, {})
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
            navContext.unsafeUpdateCurrentDescriptor({ settings: encodedSettings, kind: 'mapper' })
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

    const mapGenerator = useMapGenerator({ mapSettings: generatorMapSettings })

    const commonProps: CommonEditorProps = {
        mapSettings,
        setMapSettings: setMapSettingsWrapper,
        typeEnvironment,
        setMapEditorMode,
        mapGenerator,
    }

    return (
        <SelectionContext.Provider value={selectionContext}>
            {mapEditorMode === 'textBoxes' && <TextBoxesMapEditor {...commonProps} /> }
            {mapEditorMode === 'insets' && <InsetsMapEditor {...commonProps} />}
            {mapEditorMode === 'uss' && (
                <>
                    <USSMapEditor {...commonProps} counts={props.counts} />
                    {undoRedo.ui}
                </>
            )}
        </SelectionContext.Provider>
    )
}

interface CommonEditorProps {
    mapSettings: MapSettings
    setMapSettings: (s: MapSettings, o: ActionOptions) => void
    typeEnvironment: TypeEnvironment
    setMapEditorMode: (m: MapEditorMode) => void
    mapGenerator: MapGenerator
}

function USSMapEditor({ mapSettings, setMapSettings, counts, typeEnvironment, setMapEditorMode, mapGenerator }: CommonEditorProps & { counts: CountsByUT }): ReactNode {
    const ui = mapGenerator.ui({ mode: 'uss' })

    const exportImage = ui.exportImage

    const exportPng = exportImage
        ? async () => {
            const canvas = await exportImage()
            const pngDataUrl = canvas.toDataURL('image/png')
            const data = await fetch(pngDataUrl)
            const pngData = await data.blob()
            saveAsFile('map.png', pngData, 'image/png')
        }
        : undefined

    return (
        <universeContext.Provider value={{
            universe: mapSettings.universe ?? 'world',
            universes: universes_ordered,
            setUniverse(newUniverse) {
                setMapSettings({
                    ...mapSettings,
                    universe: newUniverse,
                }, {})
            },
        }}
        >
            <mapSettingsContext.Provider value={{ mapSettings, typeEnvironment, setMapEditorMode }}>
                <PageTemplate csvExportCallback={mapGenerator.exportCSV} screencap={exportPng} showFooter={false}>
                    <MaybeSplitLayout
                        error={mapGenerator.errors.some(e => e.kind === 'error')}
                        left={(
                            <MapperSettings
                                mapSettings={mapSettings}
                                setMapSettings={setMapSettings}
                                errors={mapGenerator.errors}
                                counts={counts}
                                typeEnvironment={typeEnvironment}
                                targetOutputTypes={validMapperOutputs}
                            />
                        )}
                        right={(
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5em' }}>
                                    <Export pngExport={exportPng} geoJSONExport={mapGenerator.exportGeoJSON} mapSettings={mapSettings} typeEnvironment={typeEnvironment} />
                                    <ImportExportCode
                                        mapSettings={mapSettings}
                                        setMapSettings={setMapSettings}
                                    />
                                </div>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    {ui.node}
                                </div>
                            </>
                        )}
                    />
                </PageTemplate>
            </mapSettingsContext.Provider>
        </universeContext.Provider>
    )
}

export const splitLayoutContext = React.createContext(false)

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
        <splitLayoutContext.Provider value={true}>
            <div style={{ display: 'flex', height, position: 'relative' }} ref={splitRef}>
                {left && (
                    <>
                        <div data-test="split-left" style={{ width: leftPct, minWidth: minLeftWidth, overflowY: 'scroll', backgroundColor: mixWithBackground(colors.hueColors.red, error ? 0.8 : 1, colors.slightlyDifferentBackground), padding: '1em', borderRadius: '5px' }}>
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
        </splitLayoutContext.Provider>
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
        <PageTemplate csvExportCallback={mapGenerator.exportCSV} showFooter={false}>
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
                                        setMapSettings({ ...mapSettings, script: { uss: doEditInsets(mapSettings, insetEdits, typeEnvironment) } }, {})
                                        setMapEditorMode('uss')
                                    }}
                                    disabled={!canUndo}
                                >
                                    Accept
                                </button>
                            </div>
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            {ui.node}
                        </div>
                    </>
                )}
            />
            {undoRedoUi}
        </PageTemplate>
    )
}

function moveInset<T extends Inset | TextBox>(inset: T, x: number, y: number): T {
    return {
        ...inset,
        bottomLeft: [inset.bottomLeft[0] + x, inset.bottomLeft[1] + y],
        topRight: [inset.topRight[0] + x, inset.topRight[1] + y],
    }
}

function inBounds(inset: Inset | TextBox): boolean {
    return inset.bottomLeft.concat(inset.topRight).every(c => c >= 0 && c <= 1)
}

function samePosition(a: Inset | TextBox, b: Inset | TextBox): boolean {
    return a.bottomLeft[0] === b.bottomLeft[0] && a.bottomLeft[1] === b.bottomLeft[1] && a.topRight[0] === b.topRight[0] && a.topRight[1] === b.topRight[1]
}

function offsetInsetInBounds<T extends Inset | TextBox>(inset: T, exclude: T[]): T {
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

function Export(props: { pngExport?: () => Promise<void>, geoJSONExport?: () => string, mapSettings: MapSettings, typeEnvironment: TypeEnvironment }): ReactNode {
    const navContext = useContext(Navigator.Context)

    const doPngExport = (): void => {
        if (props.pngExport === undefined) {
            return
        }
        void props.pngExport()
    }

    const doGeoJSONExport = (): void => {
        if (props.geoJSONExport === undefined) {
            return
        }
        saveAsFile('map.geojson', props.geoJSONExport(), 'application/geo+json')
    }

    const tableExpression = mapperToTable(props.mapSettings.script.uss, props.typeEnvironment)

    const handleConvertToTable = (): void => {
        if (!tableExpression) return
        void navContext.navigate({
            kind: 'statistic',
            article_type: props.mapSettings.geographyKind ?? 'Subnational Region',
            uss: unparse(tableExpression),
            start: 1,
            amount: 20,
            order: 'descending',
            universe: props.mapSettings.universe,
            edit: true,
            sort_column: 0,
        }, {
            history: 'push',
            scroll: { kind: 'position', top: 0 },
        })
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
                    doPngExport()
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
            {tableExpression && (
                <button
                    data-test-id="convert-to-table"
                    onClick={handleConvertToTable}
                >
                    Convert to Table
                </button>
            )}
        </div>
    )
}

function TextBoxesMapEditor({ mapSettings, setMapSettings, typeEnvironment, setMapEditorMode, mapGenerator }: CommonEditorProps): ReactNode {
    const colors = useColors()

    const [textBoxes, setTextBoxes] = useState<TextBox[]>(() => getTextBoxes(mapSettings, typeEnvironment)!)

    const selectionProperty = useMemo(() => new Property<TextBoxesSelection | undefined>(undefined), [])

    const { addState, ui: undoRedoUi, canUndo, updateCurrentSelection } = useUndoRedo<TextBox[], TextBoxesSelection | undefined>(textBoxes, undefined, setTextBoxes, (newSelection) => {
        selectionProperty.value = newSelection
    })

    // Update current selection when it changes
    useEffect(() => {
        const observer = (): void => {
            updateCurrentSelection(selectionProperty.value)
        }

        selectionProperty.observers.add(observer)
        return () => { selectionProperty.observers.delete(observer) }
    }, [selectionProperty, updateCurrentSelection])

    const setTextBoxesWithUndo = (boxes: TextBox[]): void => {
        setTextBoxes(boxes)
        addState(boxes, selectionProperty.value)
    }

    const ui = mapGenerator.ui({
        mode: 'textBoxes',
        editTextBoxes: {
            add: () => {
                const newTextBox: TextBox = {
                    bottomLeft: [0.25, 0.25],
                    topRight: [0.75, 0.75],
                    text: [{ insert: '\n' }], // bugs on applying attributes to empty text without this
                    ...defaults,
                }
                setTextBoxesWithUndo([...textBoxes, offsetInsetInBounds(newTextBox, textBoxes)])
                selectionProperty.value = { index: textBoxes.length, range: { index: 0, length: 0 } }
            },
            modify: (i, e) => {
                setTextBoxesWithUndo(textBoxes.map((textBox, j) => i === j ? { ...textBox, ...e } : textBox))
            },
            delete: (i) => {
                setTextBoxesWithUndo(textBoxes.filter((_, j) => j !== i))
                if (selectionProperty.value?.index === i) {
                    selectionProperty.value = undefined
                }
            },
            duplicate: (i) => {
                setTextBoxesWithUndo([...textBoxes, offsetInsetInBounds(textBoxes[i], textBoxes)])
                selectionProperty.value = { index: textBoxes.length, range: { index: 0, length: documentLength(textBoxes[i].text) } }
            },
            moveUp: (i) => {
                assert(i + 1 < textBoxes.length, `Cannot move text box ${i} up, already top`)
                setTextBoxesWithUndo(textBoxes.map((textBox, j) => {
                    switch (j) {
                        case i:
                            return textBoxes[i + 1]
                        case i + 1:
                            return textBoxes[i]
                        default:
                            return textBox
                    }
                }))
                if (selectionProperty.value?.index === i) {
                    selectionProperty.value = { ...selectionProperty.value, index: i + 1 }
                }
            },
            moveDown: (i) => {
                assert(i > 0, `Cannot move inset ${i} down, already bottom`)
                setTextBoxesWithUndo(textBoxes.map((textBox, j) => {
                    switch (j) {
                        case i:
                            return textBoxes[i - 1]
                        case i - 1:
                            return textBoxes[i]
                        default:
                            return textBox
                    }
                }))
                if (selectionProperty.value?.index === i) {
                    selectionProperty.value = { ...selectionProperty.value, index: i - 1 }
                }
            },
            edited: textBoxes,
        },
    })

    return (
        <PageTemplate csvExportCallback={mapGenerator.exportCSV} showFooter={false}>

            <TextBoxesSelectionContext.Provider value={selectionProperty}>
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
                                    <b>Editing Text Boxes.</b>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>

                                    <button onClick={() => { setMapEditorMode('uss') }}>
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMapSettings({ ...mapSettings, script: { uss: scriptWithNewTextBoxes(mapSettings, textBoxes, typeEnvironment) } }, {})
                                            setMapEditorMode('uss')
                                        }}
                                        disabled={!canUndo}
                                    >
                                        Accept
                                    </button>
                                </div>
                            </div>
                            <div style={{ flex: 1, position: 'relative' }}>
                                {ui.node}
                            </div>
                        </>
                    )}
                />
                {undoRedoUi}
            </TextBoxesSelectionContext.Provider>
        </PageTemplate>
    )
}
