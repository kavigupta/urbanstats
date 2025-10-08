import '../common.css'
import './article.css'

import { gzipSync } from 'zlib'

import stableStringify from 'json-stable-stringify'
import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'

import valid_geographies from '../data/mapper/used_geographies'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { defaultTypeEnvironment } from '../mapper/context'
import { Keypoints } from '../mapper/ramps'
import { ImportExportCode } from '../mapper/settings/ImportExportCode'
import { MapperSettings } from '../mapper/settings/MapperSettings'
import { Selection, SelectionContext } from '../mapper/settings/SelectionContext'
import { doEditInsets, getInsets, InsetEdits } from '../mapper/settings/insets'
import { MapSettings, computeUSS, Basemap } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { consolidatedShapeLink, indexLink } from '../navigation/links'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { loadCentroids } from '../syau/load'
import { Universe } from '../universe'
import { DisplayResults } from '../urban-stats-script/Editor'
import { getAllParseErrors, UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { doRender } from '../urban-stats-script/constants/color'
import { instantiate, ScaleInstance } from '../urban-stats-script/constants/scale'
import { EditorError, useUndoRedo } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { unparse } from '../urban-stats-script/parser'
import { TypeEnvironment } from '../urban-stats-script/types-values'
import { loadInset } from '../urban-stats-script/worker'
import { executeAsync } from '../urban-stats-script/workerManager'
import { Property } from '../utils/Property'
import { TestUtils } from '../utils/TestUtils'
import { furthestColor, interpolateColor } from '../utils/color'
import { computeAspectRatioForInsets } from '../utils/coordinates'
import { assert } from '../utils/defensive'
import { ConsolidatedShapes, Feature, IFeature } from '../utils/protos'
import { onWidthChange, useHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'
import { UnitType } from '../utils/unit'

import { CountsByUT } from './countsByArticleType'
import { Statistic } from './display-stats'
import { Insets, ShapeRenderingSpec, MapGeneric, MapGenericProps, MapHeight, ShapeType, ShapeSpec, EditInsets } from './map'

type RampToDisplay = { type: 'ramp', value: EmpiricalRamp } | { type: 'label', value: string }

interface DisplayedMapProps extends MapGenericProps {
    geographyKind: typeof valid_geographies[number]
    universe: Universe
    rampCallback: (newRamp: RampToDisplay) => void
    basemapCallback: (basemap: Basemap) => void
    insetsCallback: (insetsToUse: Insets) => void
    height: MapHeight | undefined
    uss: UrbanStatsASTStatement | undefined
    setErrors?: (errors: EditorError[]) => void
    colors: Colors
}

interface ShapesForUniverse {
    shapes: { type: 'polygon', value: NormalizeProto<IFeature>[] } | { type: 'point', value: { lon: number, lat: number }[] }
    nameToIndex: Map<string, number>
}

type ActualShapeType = { type: 'polygon', value: NormalizeProto<Feature> } | { type: 'point', value: { lon: number, lat: number } }

async function loadPolygons(geographyKind: typeof valid_geographies[number], universe: string): Promise<ShapesForUniverse> {
    const universeIdx = universes_ordered.indexOf(universe as (typeof universes_ordered)[number])
    const shapes = (await loadProtobuf(
        consolidatedShapeLink(geographyKind),
        'ConsolidatedShapes',
    )) as NormalizeProto<ConsolidatedShapes>
    const longnames: string[] = []
    const features: NormalizeProto<IFeature>[] = []
    for (let i = 0; i < shapes.longnames.length; i++) {
        if (shapes.universes[i].universeIdxs.includes(universeIdx)) {
            longnames.push(shapes.longnames[i])
            features.push(shapes.shapes[i])
        }
    }
    return { shapes: { type: 'polygon', value: features }, nameToIndex: new Map(longnames.map((r, i) => [r, i])) }
}

async function loadShapes(geographyKind: typeof valid_geographies[number], universe: string, shapeType: ShapeType): Promise<ShapesForUniverse> {
    switch (shapeType) {
        case 'polygon':
            return loadPolygons(geographyKind, universe)
        case 'point':
            const idxLink = indexLink(universe, geographyKind)
            const articles = await loadProtobuf(idxLink, 'ArticleOrderingList')
            const centroids = await loadCentroids(universe, geographyKind, articles.longnames)

            return {
                shapes: { type: 'point', value: centroids.map(c => ({ lon: c.lon!, lat: c.lat! })) },
                nameToIndex: new Map(articles.longnames.map((r, i) => [r, i])),
            }
        default:
            throw new Error(`Unknown shape type ${shapeType}`)
    }
}

interface Shapes { geographyKind: string, universe: string, shapeType: string, data: Promise<ShapesForUniverse> }

class DisplayedMap extends MapGeneric<DisplayedMapProps> {
    private shapes: undefined | Shapes
    private shapeType: undefined | ShapeType

    override shouldHaveLoadingSpinner(): boolean {
        return true
    }

    private getShapes(): Shapes {
        if (this.shapes && this.shapes.geographyKind === this.versionProps.geographyKind && this.shapes.universe === this.versionProps.universe && this.shapes.shapeType === this.shapeType) {
            return this.shapes
        }

        const st = this.shapeType
        assert(st !== undefined, 'Shape type must be set before loading shapes')

        this.shapes = {
            geographyKind: this.versionProps.geographyKind, universe: this.versionProps.universe, shapeType: st, data: (async () => {
                return loadShapes(this.versionProps.geographyKind, this.versionProps.universe, st)
            })() }

        return this.shapes
    }

    async loadShapes(name: string): Promise<ActualShapeType> {
        const mapShapes = this.getShapes()
        const { nameToIndex, shapes } = await mapShapes.data
        const index = nameToIndex.get(name)
        assert(index !== undefined && index >= 0 && index < shapes.value.length, `Shape ${name} not found in ${mapShapes.geographyKind} for ${mapShapes.universe}`)
        switch (shapes.type) {
            case 'polygon':
                return { type: 'polygon', value: shapes.value[index] as NormalizeProto<Feature> }
            case 'point':
                return { type: 'point', value: shapes.value[index] }
        }
    }

    override async loadPolygon(name: string): Promise<NormalizeProto<Feature>> {
        const res = await this.loadShapes(name)
        assert(res.type === 'polygon', `Shape ${name} is not a polygon`)
        return res.value
    }

    override async loadPoint(name: string): Promise<{ lon: number, lat: number }> {
        const res = await this.loadShapes(name)
        assert(res.type === 'point', `Shape ${name} is not a point`)
        return res.value
    }

    override async computeShapesToRender(version: number): Promise<ShapeRenderingSpec> {
        const stmts = this.versionProps.uss
        if (stmts === undefined) {
            return { shapes: [], zoomIndex: -1 }
        }
        const result = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: this.versionProps.geographyKind, universe: this.versionProps.universe }, stmts })
        if (version === this.version) {
            this.versionProps.setErrors?.(result.error)
        }
        if (result.resultingValue === undefined) {
            return { shapes: [], zoomIndex: -1 }
        }
        const mapResultMain = result.resultingValue.value
        const st: ShapeType = mapResultMain.opaqueType === 'pMap' ? 'point' : 'polygon'
        const label = mapResultMain.value.label
        this.shapeType = st

        // Handle different map types
        let lineStyle: { color: { r: number, g: number, b: number, a: number }, weight: number } | undefined
        let pointSizes: number[] | undefined

        if (mapResultMain.opaqueType === 'cMap' || mapResultMain.opaqueType === 'cMapRGB') {
            // For choropleth maps, use the outline
            lineStyle = mapResultMain.value.outline
        }
        else {
            const maxRadius = mapResultMain.value.maxRadius
            const relativeArea = mapResultMain.value.relativeArea
            pointSizes = relativeArea.map(area => Math.sqrt(area) * maxRadius)
        }

        const names = mapResultMain.value.geo
        this.versionProps.basemapCallback(mapResultMain.value.basemap)
        this.versionProps.insetsCallback(mapResultMain.value.insets)

        let colors: string[]

        if (mapResultMain.opaqueType === 'cMapRGB') {
            // For RGB maps, use the RGB values directly
            const rgbMap = mapResultMain.value
            colors = rgbMap.dataR.map((r, i) => doRender({
                r: r * 255,
                g: rgbMap.dataG[i] * 255,
                b: rgbMap.dataB[i] * 255,
                a: 255,
            }))
            this.versionProps.rampCallback({ type: 'label', value: label })
        }
        else {
            // For regular cMap, use ramp and scale
            const cMap = mapResultMain.value
            const ramp = cMap.ramp
            const scale = instantiate(cMap.scale)
            const interpolations = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(scale.inverse)
            this.versionProps.rampCallback({ type: 'ramp', value: { ramp, interpolations, scale, label, unit: mapResultMain.value.unit } })
            const furthest = furthestColor(ramp.map(x => x[1]))
            colors = cMap.data.map(
                val => interpolateColor(ramp, scale.forward(val), furthest),
            )
        }
        const specs = colors.map(
            // no outline, set color fill, alpha=1
            (color, i): ShapeSpec => {
                switch (st) {
                    case 'polygon':
                        return {
                            type: 'polygon',
                            style: {
                                fillColor: color,
                                fillOpacity: 1,
                                color: doRender(lineStyle!.color),
                                weight: lineStyle!.weight,
                            },
                        }
                    case 'point':
                        return {
                            type: 'point',
                            style: {
                                fillColor: color,
                                fillOpacity: 1,
                                radius: pointSizes![i],
                            },
                        }
                }
            },
        )
        const metas = mapResultMain.opaqueType === 'cMap' || mapResultMain.opaqueType === 'pMap'
            ? mapResultMain.value.data.map((x) => { return { statistic: x } })
            : mapResultMain.value.dataR.map((x, i) => { return { statistic: [x, mapResultMain.value.dataG[i], mapResultMain.value.dataB[i]] } })
        return {
            shapes: names.map((name, i) => ({
                name,
                spec: specs[i],
                meta: metas[i],
            })),
            zoomIndex: -1,
        }
    }

    override progressivelyLoadShapes(): boolean {
        return false
    }
}

function colorbarStyleFromBasemap(basemap: Basemap): React.CSSProperties {
    switch (basemap.type) {
        case 'osm':
            return { }
        case 'none':
            return { backgroundColor: basemap.backgroundColor, color: basemap.textColor }
    }
}

function Colorbar(props: { ramp: RampToDisplay | undefined, basemap: Basemap }): ReactNode {
    // do this as a table with 10 columns, each 10% wide and
    // 2 rows. Top one is the colorbar, bottom one is the
    // labels.
    const valuesRef = useRef<HTMLDivElement>(null)
    const shouldRotate: boolean = useSyncExternalStore(onWidthChange, () => {
        if (valuesRef.current === null) {
            return false
        }
        const current = valuesRef.current
        const containers = current.querySelectorAll('.containerOfXticks')
        // eslint-disable-next-line @typescript-eslint/prefer-for-of -- this isn't a loop over an array
        for (let i = 0; i < containers.length; i++) {
            const container = containers[i] as HTMLDivElement
            const contained: HTMLDivElement | null = container.querySelector('.containedOfXticks')
            if (contained === null) {
                continue
            }
            if (contained.offsetWidth > container.offsetWidth * 0.9) {
                return true
            }
        }
        return false
    })

    const furthest = useMemo(() => props.ramp === undefined || props.ramp.type !== 'ramp' ? undefined : furthestColor(props.ramp.value.ramp.map(x => x[1])), [props.ramp])

    if (props.ramp === undefined) {
        return <div></div>
    }

    if (props.ramp.type === 'label') {
        return (
            <div className="centered_text" style={colorbarStyleFromBasemap(props.basemap)}>
                {props.ramp.value}
            </div>
        )
    }

    const ramp = props.ramp.value.ramp
    const scale = props.ramp.value.scale
    const label = props.ramp.value.label
    const values = props.ramp.value.interpolations
    const unit = props.ramp.value.unit
    const style = colorbarStyleFromBasemap(props.basemap)

    const createValue = (stat: number): ReactNode => {
        return (
            <div className="centered_text" style={style}>
                <Statistic
                    statname={label}
                    value={stat}
                    isUnit={false}
                    unit={unit}
                />
                <Statistic
                    statname={label}
                    value={stat}
                    isUnit={true}
                    unit={unit}
                />
            </div>
        )
    }

    const width = `${100 / values.length}%`

    const valuesDivs = (rotate: boolean): ReactNode[] => values.map((x, i) => (
        <div
            key={i}
            style={{
                width,
                // height: rotate ? '2em' : '1em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            className="containerOfXticks"
        >
            <div
                style={{
                    // transform: rotate ? 'rotate(-45deg)' : 'none',
                    writingMode: rotate ? 'sideways-lr' : 'horizontal-tb',
                    padding: rotate ? '0.5em' : '0',
                    // transformOrigin: 'center',
                    // whiteSpace: 'nowrap',
                    // fontSize: rotate ? '0.8em' : '1em',
                }}
                className="containedOfXticks"
            >
                {createValue(x)}
            </div>
        </div>
    ))

    return (
        <div style={{ ...style, position: 'relative' }}>
            <div style={{ display: 'flex', width: '100%' }}>
                {
                    values.map((x, i) => (
                        <div
                            key={i}
                            style={{
                                width, height: '1em',
                                backgroundColor: interpolateColor(ramp, scale.forward(x), furthest),
                                marginLeft: '1px',
                                marginRight: '1px',
                            }}
                        >
                        </div>
                    ))
                }
            </div>
            <div ref={valuesRef} style={{ position: 'absolute', top: 0, left: 0, display: 'flex', width: '100%', visibility: 'hidden' }}>{valuesDivs(false)}</div>
            <div style={{ display: 'flex', width: '100%' }}>{valuesDivs(shouldRotate)}</div>
            <div className="centered_text">
                {label}
            </div>
        </div>
    )
}

interface MapComponentProps {
    geographyKind: typeof valid_geographies[number]
    universe: Universe
    mapRef?: React.RefObject<DisplayedMap>
    uss: UrbanStatsASTStatement | undefined
    setErrors?: (errors: EditorError[]) => void
    colorbarRef?: React.RefObject<HTMLDivElement>
    editInsets?: EditInsets
    overrideInsets?: Insets
}

interface EmpiricalRamp {
    ramp: Keypoints
    scale: ScaleInstance
    interpolations: number[]
    label: string
    unit?: UnitType
}

function MapComponent(props: MapComponentProps): ReactNode {
    const [empiricalRamp, setEmpiricalRamp] = useState<RampToDisplay | undefined>(undefined)
    const [basemap, setBasemap] = useState<Basemap>({ type: 'osm' })

    const [currentInsets, setCurrentInsets] = useState<Insets>(loadInset(props.universe))

    const aspectRatio = computeAspectRatioForInsets(currentInsets)

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
        }}
        >
            <div style={{ height: '90%', width: '100%' }}>
                <DisplayedMap
                    geographyKind={props.geographyKind}
                    universe={props.universe}
                    rampCallback={(newRamp) => { setEmpiricalRamp(newRamp) }}
                    basemapCallback={(newBasemap) => { setBasemap(newBasemap) }}
                    insetsCallback={(newInsets) => { setCurrentInsets(newInsets) }}
                    ref={props.mapRef}
                    uss={props.uss}
                    height={{ type: 'aspect-ratio', value: aspectRatio }}
                    attribution="startVisible"
                    basemap={basemap}
                    setErrors={props.setErrors}
                    colors={useColors()}
                    insets={props.overrideInsets ?? currentInsets}
                    key={stableStringify({ currentInsets, editInsets: !!props.editInsets })}
                    editInsets={props.editInsets}
                    dropEmptyInsets={props.editInsets === undefined}
                />
            </div>
            <div style={{ height: '8%', width: '100%' }} ref={props.colorbarRef}>
                <Colorbar
                    ramp={empiricalRamp}
                    basemap={basemap}
                />
            </div>
        </div>
    )
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

function Export(props: { mapRef: React.RefObject<DisplayedMap>, colorbarRef: React.RefObject<HTMLDivElement> }): ReactNode {
    const colors = useColors()

    const exportAsPng = async (): Promise<void> => {
        if (props.mapRef.current === null) {
            return
        }
        const colorbarElement = props.colorbarRef.current ?? undefined
        const pngDataUrl = await props.mapRef.current.exportAsPng(colorbarElement, colors.background, colors.mapInsetBorderColor)
        const data = await fetch(pngDataUrl)
        const pngData = await data.blob()
        saveAsFile('map.png', pngData, 'image/png')
    }

    const exportAsGeoJSON = async (): Promise<void> => {
        if (props.mapRef.current === null) {
            return
        }
        const geojson = await props.mapRef.current.exportAsGeoJSON()
        saveAsFile('map.geojson', geojson, 'application/geo+json')
    }

    return (
        <div style={{
            display: 'flex',
            gap: '0.5em',
            margin: '0.5em 0',
        }}
        >
            <button onClick={() => {
                void exportAsPng()
            }}
            >
                Export as PNG
            </button>
            <button onClick={() => {
                void exportAsGeoJSON()
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

export function MapperPanel(props: { mapSettings: MapSettings, view: boolean, counts: CountsByUT }): ReactNode {
    if (props.view) {
        return <MapComponentWrapper {...props.mapSettings} uss={computeUSS(props.mapSettings.script)} />
    }

    return <EditMapperPanel {...props} />
}

function MapComponentWrapper(props: Omit<MapComponentProps, 'universe' | 'geographyKind'> & { universe: MapComponentProps['universe'] | undefined, geographyKind: MapComponentProps['geographyKind'] | undefined }): ReactNode {
    return (props.geographyKind === undefined || props.universe === undefined)
        ? <DisplayResults results={[{ kind: 'error', type: 'error', value: 'Select a Universe and Geography Kind', location: noLocation }]} editor={false} />
        : (
                <MapComponent
                    {...props}
                    geographyKind={props.geographyKind}
                    universe={props.universe}
                />
            )
}

type MapEditorMode = 'uss' | 'insets'

function EditMapperPanel(props: { mapSettings: MapSettings, counts: CountsByUT }): ReactNode {
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

    const headerTextClass = useHeaderTextClass()

    const typeEnvironment = useMemo(() => defaultTypeEnvironment(mapSettings.universe), [mapSettings.universe])

    // Update current selection when it changes
    useEffect(() => {
        const observer = (): void => {
            updateCurrentSelection(selectionContext.value)
        }

        selectionContext.observers.add(observer)
        return () => { selectionContext.observers.delete(observer) }
    }, [selectionContext, updateCurrentSelection])

    const commonProps: CommonEditorProps = {
        mapSettings,
        setMapSettings: setMapSettingsWrapper,
        typeEnvironment,
        setMapEditorMode,
    }

    return (
        <PageTemplate hasCSVButton={true}>
            <SelectionContext.Provider value={selectionContext}>
                <div className={headerTextClass}>Urban Stats Mapper (beta)</div>
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
}

function USSMapEditor({ mapSettings, setMapSettings, counts, typeEnvironment, setMapEditorMode }: CommonEditorProps & { counts: CountsByUT }): ReactNode {
    const [errors, setErrors] = useState<EditorError[]>([])

    const mapRef = useRef<DisplayedMap>(null)
    const colorbarRef = useRef<HTMLDivElement>(null)

    const [uss, setUSS] = useState<UrbanStatsASTStatement | undefined>(undefined)

    useEffect(() => {
        const result = computeUSS(mapSettings.script)
        const parseErrors = getAllParseErrors(result)
        if (parseErrors.length > 0) {
            setErrors(parseErrors.map(e => ({ ...e, kind: 'error' })))
        }
        setUSS(parseErrors.length > 0 ? undefined : result)
    }, [mapSettings])

    return (
        <>
            <MapperSettings
                mapSettings={mapSettings}
                setMapSettings={setMapSettings}
                errors={errors}
                counts={counts}
                typeEnvironment={typeEnvironment}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5em' }}>
                <Export
                    mapRef={mapRef}
                    colorbarRef={colorbarRef}
                />
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
            <MapComponentWrapper
                geographyKind={mapSettings.geographyKind}
                universe={mapSettings.universe}
                uss={uss}
                mapRef={mapRef}
                setErrors={setErrors}
                colorbarRef={colorbarRef}
            />
        </>

    )
}

function InsetsMapEditor({ mapSettings, setMapSettings, typeEnvironment, setMapEditorMode }: CommonEditorProps): ReactNode {
    const colors = useColors()

    const [insetEdits, setInsetEdits] = useState<InsetEdits>(new Map())

    const { addState, ui: undoRedoUi } = useUndoRedo(insetEdits, undefined, setInsetEdits, () => undefined)

    const insetsProps = useMemo(() => getInsets(mapSettings, typeEnvironment)!.map(inset => new Property(inset)), [mapSettings, typeEnvironment])

    useEffect(() => {
        const baseInsets = getInsets(mapSettings, typeEnvironment)!
        for (const [i, insetProp] of insetsProps.entries()) {
            insetProp.value = { ...baseInsets[i], ...insetEdits.get(i) }
        }
    }, [insetEdits, insetsProps, mapSettings, typeEnvironment])

    return (
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
                        disabled={insetEdits.size === 0}
                    >
                        Accept
                    </button>
                </div>
            </div>
            <MapComponentWrapper
                geographyKind={mapSettings.geographyKind}
                universe={mapSettings.universe}
                uss={computeUSS(mapSettings.script)}
                editInsets={{
                    doEdit: (i, e) => {
                        setInsetEdits((edits) => {
                            const newEdits = new Map(edits)
                            newEdits.set(i, { ...newEdits.get(i), ...e })
                            addState(newEdits, undefined)
                            return newEdits
                        })
                    },
                    subscribeChanges: insetsProps,
                }}
            />
            {undoRedoUi}
        </>
    )
}
