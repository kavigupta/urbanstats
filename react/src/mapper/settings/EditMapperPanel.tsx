import React, { Fragment, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { CountsByUT } from '../../components/countsByArticleType'
import { DivThatTakesUpTheRestOfThePage, MaybeSplitLayout } from '../../components/split-layout'
import universes_ordered from '../../data/universes_ordered'
import { Navigator } from '../../navigation/Navigator'
import { useColors } from '../../page_template/colors'
import { useUnitSettings } from '../../page_template/settings'
import { PageTemplate } from '../../page_template/template'
import { universeContext } from '../../universe'
import { Frame, Inset, InsetNode, isSplit, layoutInsets, listAt, mapList, mapNode, relativeTo } from '../../urban-stats-script/constants/insets'
import { documentLength } from '../../urban-stats-script/constants/rich-text'
import { defaults, TextBox } from '../../urban-stats-script/constants/text-box'
import { unparse } from '../../urban-stats-script/parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { Property } from '../../utils/Property'
import { TestUtils } from '../../utils/TestUtils'
import { makeDebugLogger } from '../../utils/debug-logging'
import { assert } from '../../utils/defensive'
import { mapperToTable } from '../../utils/page-conversion'
import { useMobileLayout } from '../../utils/responsive'
import { saveAsFile } from '../../utils/saveAsFile'
import { base64Gzip } from '../../utils/urlParamShort'
import { useUndoRedo } from '../../utils/useUndoRedo'
import { zIndex } from '../../utils/zIndex'
import { SplitDivider, SplitFrameHandles } from '../components/InsetMap'
import { Selection as TextBoxesSelection, SelectionContext as TextBoxesSelectionContext } from '../components/MapTextBox'
import { defaultTypeEnvironment, loadInsets } from '../context'
import { MapGenerator, transformContext, useMapGenerator } from '../map-generator'

import { ImportExportCode } from './ImportExportCode'
import { mapSettingsContext } from './MapSettingsContext'
import { MapperSettings } from './MapperSettings'
import { Selection, SelectionContext } from './SelectionContext'
import { deleteInsets, doEditInsets, fitInsetMapBounds, getInsets, InsetEdits, normalizeInsetScreenBounds, setInsets, splitInsets, swapInsets } from './edit-insets'
import { getTextBoxes, scriptWithNewTextBoxes } from './edit-text-boxes'
import { validMapperOutputs } from './map-uss'
import { mapPageTitle, MapEditorMode, MapSettings, universesOf } from './utils'

const debugLog = makeDebugLogger('mapExport')

export interface ActionOptions { undoable?: boolean, update?: boolean }

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
        if (actionOptions.update === false) {
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
        // Compressing is async, so a superseded run must not overwrite the URL of a later one.
        let stale = false
        if (props.mapSettings !== mapSettings) {
            void base64Gzip(jsonedSettings).then((encodedSettings) => {
                if (!stale) {
                    navContext.unsafeUpdateCurrentDescriptor({ settings: encodedSettings, kind: 'mapper' }, { history: 'replaceState' })
                }
            })
        }
        return () => { stale = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- props.view won't be set except from the navigator
    }, [jsonedSettings, navContext])

    const unitSettings = useUnitSettings()

    useEffect(() => {
        // Written straight to the document rather than through the page state, which would rerender
        // the whole page for every edit.
        // eslint-disable-next-line no-restricted-syntax -- The exception the rule describes.
        document.title = mapPageTitle(mapSettings, unitSettings)
    }, [mapSettings, unitSettings])

    const typeEnvironment = useMemo(() => defaultTypeEnvironment(universesOf(mapSettings.geographies)), [mapSettings.geographies])

    // Update current selection when it changes
    useEffect(() => {
        const observer = (): void => {
            updateCurrentSelection(selectionContext.value)
        }

        selectionContext.observers.add(observer)
        return () => { selectionContext.observers.delete(observer) }
    }, [selectionContext, updateCurrentSelection])

    const mapGenerator = useMapGenerator({ mapSettings: generatorMapSettings, typeEnvironment })

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
            debugLog('exportPng: requesting canvas from map generator')
            const canvas = await exportImage()
            debugLog('exportPng: received canvas', canvas.width, 'x', canvas.height, ', encoding as PNG data URL')
            const pngDataUrl = canvas.toDataURL('image/png')
            debugLog('exportPng: data URL length', pngDataUrl.length, ', fetching as blob')
            const data = await fetch(pngDataUrl)
            const pngData = await data.blob()
            debugLog('exportPng: blob size', pngData.size, 'bytes, saving file')
            saveAsFile('map.png', pngData, 'image/png')
            debugLog('exportPng: file saved')
        }
        : undefined

    return (
        <universeContext.Provider value={mapSettings.geographies.length === 1
            ? {
                    universe: mapSettings.geographies[0].universe,
                    universes: universes_ordered,
                    setUniverse(newUniverse) {
                        setMapSettings({ ...mapSettings, geographies: [{ ...mapSettings.geographies[0], universe: newUniverse }] }, {})
                    },
                }
            : undefined}
        >
            <mapSettingsContext.Provider value={{ mapSettings, typeEnvironment, setMapEditorMode }}>
                <transformContext.Provider value={{ selfDetermineHeight: useMobileLayout() }}>
                    <PageTemplate fullWidth csvExportCallback={mapGenerator.exportCSV} screencap={exportPng} showFooter={false}>
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
                                    assignments={mapGenerator.assignments}
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
                </transformContext.Provider>
            </mapSettingsContext.Provider>
        </universeContext.Provider>
    )
}

function InsetsMapEditor({ mapSettings, setMapSettings, typeEnvironment, setMapEditorMode, mapGenerator }: CommonEditorProps): ReactNode {
    const colors = useColors()

    const isMobile = useMobileLayout()

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

    const { leaves, splits } = layoutInsets(editedInsets)

    const apply = (next: InsetNode[]): void => {
        addInsetEdit(setInsets(insetEdits, editedInsets, next))
    }

    const setFrameAt = (path: number[], cell: Frame) => (frame: Frame) => {
        const relative = relativeTo(cell, frame)
        apply(mapNode(editedInsets, path, node => [{ ...node, bottomLeft: [relative[0], relative[1]], topRight: [relative[2], relative[3]] }]))
    }

    const reorder = (path: number[]): { moveUp?: () => void, moveDown?: () => void } => {
        const listPath = path.slice(0, -1)
        const i = path[path.length - 1]
        const swapWith = (j: number) => () => {
            if (path.length === 1) {
                // Keeps the expressions of both insets
                addInsetEdit(swapInsets(insetEdits, i, j))
            }
            else {
                apply(mapList(editedInsets, listPath, list => list.map((node, k) => k === i ? list[j] : k === j ? list[i] : node)))
            }
        }
        return {
            moveUp: i + 1 < listAt(editedInsets, listPath).length ? swapWith(i + 1) : undefined,
            moveDown: i > 0 ? swapWith(i - 1) : undefined,
        }
    }

    const insertAfter = (path: number[], node: (list: InsetNode[]) => InsetNode): void => {
        const i = path[path.length - 1]
        apply(mapList(editedInsets, path.slice(0, -1), list => [...list.slice(0, i + 1), node(list), ...list.slice(i + 1)]))
    }

    const newInset = (): Inset => {
        const { coordBox, name } = loadInsets(mapSettings.geographies.length > 0 ? universesOf(mapSettings.geographies) : 'world')[0]
        return { coordBox, name, bottomLeft: [0.25, 0.25], topRight: [0.75, 0.75], mainMap: false }
    }

    const ui = mapGenerator.ui({
        mode: 'insets',
        editInsets: {
            edited: leaves,
            handlers: (i) => {
                const { path, mainMap, cell } = leaves[i]
                const remaining = deleteInsets(editedInsets, path)
                return {
                    setCoordBox: (coordBox) => {
                        apply(mapNode(editedInsets, path, (node) => {
                            assert(!isSplit(node), 'Setting the map bounds of a split')
                            return [{ ...node, coordBox }]
                        }))
                    },
                    // Main maps fill their cell in a split
                    setFrame: path.length === 1 || !mainMap ? setFrameAt(path, cell) : undefined,
                    bounds: cell,
                    delete: layoutInsets(remaining).leaves.some(leaf => leaf.mainMap) ? () => { apply(remaining) } : undefined,
                    duplicate: mainMap ? undefined : () => { insertAfter(path, list => offsetInsetInBounds(list[path[path.length - 1]], list)) },
                    add: mainMap ? () => { apply(mapList(editedInsets, path.slice(0, -1), list => [...list, offsetInsetInBounds(newInset(), list)])) } : undefined,
                    // Allowing reordering on the main map in case you want to put its corner in front of an inset
                    ...reorder(path),
                    split: (direction) => { apply(splitInsets(editedInsets, path, direction)) },
                }
            },
            overlay: container => splits.map(split => (
                <Fragment key={split.path.join('-')}>
                    {(split.path.length === 1 || !leaves.some(leaf => leaf.mainMap && split.path.every((p, k) => leaf.path[k] === p))) && (
                        <SplitFrameHandles frame={split.frame} container={container} handlers={{ setFrame: setFrameAt(split.path, split.cell), bounds: split.cell, ...reorder(split.path) }} />
                    )}
                    {split.cells.slice(1).map((_, j) => (
                        <SplitDivider
                            key={j}
                            split={split}
                            j={j}
                            container={container}
                            setProportions={(proportions) => {
                                apply(mapNode(editedInsets, split.path, (node) => {
                                    assert(isSplit(node), 'Setting the proportions of a leaf')
                                    return [{ ...node, children: node.children.map((cell, k) => ({ ...cell, proportion: proportions[k] })) }]
                                }))
                            }}
                        />
                    ))}
                </Fragment>
            )),
        },
    })

    return (
        <PageTemplate fullWidth topPanel={!isMobile} csvExportCallback={mapGenerator.exportCSV} showFooter={false}>
            <MaybeSplitLayout
                left={undefined}
                error={false}
                right={(
                    <>
                        <div style={{
                            backgroundColor: colors.slightlyDifferentBackgroundFocused,
                            borderRadius: '5px',
                            padding: '10px',
                            margin: isMobile ? 0 : '10px 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '0.5em',
                            ...(isMobile ? { position: 'absolute', zIndex: zIndex.mobileUndoRedoControls, bottom: 0, left: 0 } : {}),
                        }}
                        >
                            {!isMobile && (
                                <div>
                                    <b>Editing Insets.</b>
                                    {' '}
                                    Pans and zooms to maps will be reflected permanently. Drag inset frames to reposition and resize, and dividers to resize split insets.
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button style={{ height: isMobile ? 30 : undefined }} onClick={() => { setMapEditorMode('uss') }}>
                                    Cancel
                                </button>
                                <button
                                    style={{ height: isMobile ? 30 : undefined }}
                                    onClick={() => {
                                        const original = getInsets(mapSettings, typeEnvironment)!
                                        const fitted = mapGenerator.aspectRatio === undefined ? insetEdits : fitInsetMapBounds(insetEdits, original, mapGenerator.aspectRatio)
                                        setMapSettings({ ...mapSettings, script: { uss: doEditInsets(mapSettings, normalizeInsetScreenBounds(fitted, fitted.insets(original)), typeEnvironment) } }, {})
                                        setMapEditorMode('uss')
                                    }}
                                    disabled={!canUndo}
                                >
                                    Accept
                                </button>
                            </div>
                        </div>
                        <DivThatTakesUpTheRestOfThePage style={{ position: 'relative' }}>
                            {ui.node}
                        </DivThatTakesUpTheRestOfThePage>
                    </>
                )}
            />
            {undoRedoUi}
        </PageTemplate>
    )
}

function moveInset<T extends InsetNode | TextBox>(inset: T, x: number, y: number): T {
    return {
        ...inset,
        bottomLeft: [inset.bottomLeft[0] + x, inset.bottomLeft[1] + y],
        topRight: [inset.topRight[0] + x, inset.topRight[1] + y],
    }
}

function inBounds(inset: InsetNode | TextBox): boolean {
    return inset.bottomLeft.concat(inset.topRight).every(c => c >= 0 && c <= 1)
}

function samePosition(a: InsetNode | TextBox, b: InsetNode | TextBox): boolean {
    return a.bottomLeft[0] === b.bottomLeft[0] && a.bottomLeft[1] === b.bottomLeft[1] && a.topRight[0] === b.topRight[0] && a.topRight[1] === b.topRight[1]
}

function offsetInsetInBounds<T extends InsetNode | TextBox>(inset: T, exclude: T[]): T {
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
        debugLog('Export button clicked')
        if (props.pngExport === undefined) {
            debugLog('exportImage not ready, ignoring click')
            return
        }
        debugLog('invoking exportPng')
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
            geographies: props.mapSettings.geographies,
            uss: unparse(tableExpression),
            start: 1,
            amount: 20,
            order: 'descending',
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
                View
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

    const isMobile = useMobileLayout()

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
        <PageTemplate fullWidth topPanel={!isMobile} csvExportCallback={mapGenerator.exportCSV} showFooter={false}>
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
                                margin: isMobile ? 0 : '10px 0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '0.5em',
                                ...(isMobile ? { position: 'absolute', zIndex: zIndex.mobileUndoRedoControls, bottom: 0, left: 0 } : {}),
                            }}
                            >
                                {!isMobile && (
                                    <div>
                                        <b>Editing Text Boxes.</b>
                                    </div>
                                )}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button style={{ height: isMobile ? 30 : undefined }} onClick={() => { setMapEditorMode('uss') }}>
                                        Cancel
                                    </button>
                                    <button
                                        style={{ height: isMobile ? 30 : undefined }}
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
                            <DivThatTakesUpTheRestOfThePage style={{ position: 'relative' }}>
                                {ui.node}
                            </DivThatTakesUpTheRestOfThePage>
                        </>
                    )}
                />
                {undoRedoUi}
            </TextBoxesSelectionContext.Provider>
        </PageTemplate>
    )
}
