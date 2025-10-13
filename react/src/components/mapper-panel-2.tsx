import { gzipSync } from 'zlib'

import React, { ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { MapRef, useMap } from 'react-map-gl/maplibre'

import valid_geographies from '../data/mapper/used_geographies'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { boundingBox, geometry } from '../map-partition'
import { defaultTypeEnvironment } from '../mapper/context'
import { Keypoints } from '../mapper/ramps'
import { ImportExportCode } from '../mapper/settings/ImportExportCode'
import { MapperSettings } from '../mapper/settings/MapperSettings'
import { Selection, SelectionContext } from '../mapper/settings/SelectionContext'
import { doEditInsets, getInsets, InsetEdits } from '../mapper/settings/insets'
import { Basemap, computeUSS, MapSettings } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { consolidatedShapeLink, indexLink } from '../navigation/links'
import { LongLoad } from '../navigation/loading'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { PageTemplate } from '../page_template/template'
import { loadCentroids } from '../syau/load'
import { Universe } from '../universe'
import { DisplayResults } from '../urban-stats-script/Editor'
import { doRender } from '../urban-stats-script/constants/color'
import { instantiate, ScaleInstance } from '../urban-stats-script/constants/scale'
import { EditorError, useUndoRedo } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { unparse } from '../urban-stats-script/parser'
import { TypeEnvironment, USSOpaqueValue } from '../urban-stats-script/types-values'
import { executeAsync } from '../urban-stats-script/workerManager'
import { Property } from '../utils/Property'
import { TestUtils } from '../utils/TestUtils'
import { furthestColor, interpolateColor } from '../utils/color'
import { computeAspectRatioForInsets } from '../utils/coordinates'
import { ConsolidatedShapes, Feature, IFeature } from '../utils/protos'
import { onWidthChange, useHeaderTextClass } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'
import { UnitType } from '../utils/unit'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { CountsByUT } from './countsByArticleType'
import { CSVExportData, generateMapperCSVData } from './csv-export'
import { Statistic } from './display-stats'
import { CommonMaplibreMap, insetBorderWidth, PointFeatureCollection, Polygon, PolygonFeatureCollection } from './map-common'
import { mapBorderRadius, mapBorderWidth, screencapElement } from './screenshot'
import { renderMap } from './screenshot-map'

export interface Inset { bottomLeft: [number, number], topRight: [number, number], coordBox: [number, number, number, number], mainMap: boolean, name?: string }
export type Insets = Inset[]

export type EditSingleInset = (newInset: Partial<Inset>) => void
export type EditMultipleInsets = (index: number, newInset: Partial<Inset>) => void
export interface EditInsets { doEdit: EditMultipleInsets, subscribeChanges: Property<Inset>[] }

export function MapperPanel(props: { mapSettings: MapSettings, view: boolean, counts: CountsByUT }): ReactNode {
    if (props.view) {
        return <DisplayMap mapSettings={props.mapSettings} />
    }

    return <EditMapperPanel {...props} />
}

function DisplayMap({ mapSettings }: { mapSettings: MapSettings }): ReactNode {
    const mapGenerator = useOrderedResolve(useMemo(() => makeMapGenerator({ mapSettings }), [mapSettings]))
    return (
        <>
            {mapGenerator.result?.ui({ mode: 'view', loading: mapGenerator.loading }).node ?? <LongLoad />}
        </>
    )
}

function RelativeLoader({ loading }: { loading: boolean }): ReactNode {
    return (
        <LongLoad containerStyleOverride={{
            position: 'absolute',
            transition: 'opacity 0.25s',
            opacity: loading ? 1 : 0,
            pointerEvents: 'none',
        }}
        />
    )
}

function MapSkeleton(): ReactNode {
    const colors = useColors()
    return (
        <div style={{
            width: '100%',
            height: 600,
            pointerEvents: 'none',
            position: 'relative',
            backgroundColor: colors.slightlyDifferentBackground,
            borderRadius: mapBorderRadius,
            border: `${mapBorderWidth}px solid ${colors.borderNonShadow}`,
        }}
        >
            <RelativeLoader loading={true} />
        </div>
    )
}

type MapUIProps = ({ loading: boolean }) & ({ mode: 'view' } | { mode: 'uss' } | { mode: 'insets', doEdit: EditMultipleInsets, editedInsets: Insets })

interface MapGenerator {
    ui: (props: MapUIProps) => { node: ReactNode, exportPng?: (colors: Colors) => Promise<string> }
    exportGeoJSON?: () => string
    exportCSV?: CSVExportData
    errors: EditorError[]
}

async function makeMapGenerator({ mapSettings }: { mapSettings: MapSettings }): Promise<MapGenerator> {
    if (mapSettings.geographyKind === undefined || mapSettings.universe === undefined) {
        return {
            ui: () => ({
                node: <DisplayResults results={[{ kind: 'error', type: 'error', value: 'Select a Universe and Geography Kind', location: noLocation }]} editor={false} />,
            }),
            errors: [],
        }
    }

    const stmts = computeUSS(mapSettings.script)

    const execResult = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: mapSettings.geographyKind, universe: mapSettings.universe }, stmts })

    if (execResult.resultingValue === undefined) {
        return {
            ui: () => ({
                node: <DisplayResults results={execResult.error} editor={false} />,
            }),
            errors: [],
        }
    }

    const mapResultMain = execResult.resultingValue.value

    const csvData = generateMapperCSVData(mapResultMain, execResult.context)
    const csvFilename = `${mapSettings.geographyKind}-${mapSettings.universe}-data.csv`

    const { features, mapChildren, ramp } = await loadMapResult({ mapResultMain, universe: mapSettings.universe, geographyKind: mapSettings.geographyKind })

    return {
        errors: execResult.error,
        exportCSV: {
            csvData,
            csvFilename,
        },
        exportGeoJSON: () => exportAsGeoJSON(features),
        ui: (props) => {
            const mapsRef: (MapRef | null)[] = []

            let visibleInsetIndex = -1

            const insetMaps = mapResultMain.value.insets.flatMap((inset) => {
                const insetFeatures = filterOverlaps(inset, features)
                if (insetFeatures.length === 0 && props.mode !== 'insets') {
                    return []
                }
                visibleInsetIndex++
                return [
                    { inset, map: (
                        <InsetMap key={visibleInsetIndex} inset={inset} ref={e => mapsRef[visibleInsetIndex] = e}>
                            {mapChildren(insetFeatures)}
                        </InsetMap>
                    ) },
                ]
            })

            const visibleInsets = insetMaps.map(({ inset }) => inset)

            const colorbarRef = React.createRef<HTMLDivElement>()

            return {
                node: (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                    }}
                    >
                        <RelativeLoader loading={props.loading} />
                        <div style={{ height: '90%', width: '100%' }}>
                            <div style={{
                                width: '100%',
                                minHeight: '300px',
                                aspectRatio: computeAspectRatioForInsets(visibleInsets),
                                position: 'relative',
                            }}
                            >
                                {insetMaps.map(({ map }) => map)}
                            </div>
                        </div>
                        <div style={{ height: '8%', width: '100%' }} ref={colorbarRef}>
                            <Colorbar
                                ramp={ramp}
                                basemap={mapResultMain.value.basemap}
                            />
                        </div>
                    </div>

                ),
                exportPng: colors =>
                    exportAsPng({ colors, colorbarElement: colorbarRef.current!, insets: visibleInsets, maps: mapsRef.map(r => r!.getMap()), basemap: mapResultMain.value.basemap }),
            }
        },
    }
}

async function loadMapResult({ mapResultMain: { opaqueType, value }, universe, geographyKind }:
{ mapResultMain: USSOpaqueValue & { opaqueType: 'cMap' | 'cMapRGB' | 'pMap' }
    universe: Universe
    geographyKind: typeof valid_geographies[number]
}): Promise<{ features: GeoJSON.Feature[], mapChildren: (fs: GeoJSON.Feature[]) => ReactNode, ramp: RampToDisplay }> {
    let ramp: RampToDisplay
    let colors: string[]
    switch (opaqueType) {
        case 'pMap':
        case 'cMap':
            const scale = instantiate(value.scale)
            const furthest = furthestColor(value.ramp.map(x => x[1]))
            const interpolations = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(scale.inverse)
            ramp = { type: 'ramp', value: { ramp: value.ramp, interpolations, scale, label: value.label, unit: value.unit } }
            colors = value.data.map(val => interpolateColor(value.ramp, scale.forward(val), furthest))
            break
        case 'cMapRGB':
            colors = value.dataR.map((r, i) => doRender({
                r: r * 255,
                g: value.dataG[i] * 255,
                b: value.dataB[i] * 255,
                a: 255,
            }))
            ramp = { type: 'label', value: value.label }
            break
    }

    let features: GeoJSON.Feature[]
    let mapChildren: (fs: GeoJSON.Feature[]) => ReactNode
    switch (opaqueType) {
        case 'pMap':
            const points: Point[] = Array.from(value.data.entries()).map(([i, dataValue]) => {
                return {
                    name: value.geo[i],
                    fillColor: colors[i],
                    fillOpacity: 1,
                    radius: Math.sqrt(value.relativeArea[i]) * value.maxRadius,
                    meta: {
                        statistic: dataValue,
                    },
                }
            })

            features = await pointsGeojson(geographyKind, universe, points)

            mapChildren = fs => (
                <>
                    <PointFeatureCollection features={fs} clickable={true} />
                </>
            )
            break
        case 'cMap':
        case 'cMapRGB':
            const polys: Polygon[] = Array.from(colors.entries()).map(([i, color]) => {
                let meta
                switch (opaqueType) {
                    case 'cMap':
                        meta = { statistic: value.data[i] }
                        break
                    case 'cMapRGB':
                        meta = { statistic: [value.dataR[i], value.dataG[i], value.dataB[i]] }
                        break
                }

                return {
                    name: value.geo[i],
                    fillColor: color,
                    fillOpacity: 1,
                    color: doRender(value.outline.color),
                    weight: value.outline.weight,
                    meta,
                }
            })

            features = await polygonsGeojson(geographyKind, universe, polys)

            mapChildren = fs => (
                <>
                    <PolygonFeatureCollection features={fs} clickable={true} />
                </>
            )

            break
    }

    return {
        features,
        mapChildren,
        ramp,
    }
}

async function exportAsPng({
    colors,
    colorbarElement,
    insets,
    maps,
    basemap,
}: {
    colorbarElement: HTMLElement | undefined
    colors: Colors
    insets: Inset[]
    maps: maplibregl.Map[]
    basemap: Basemap
}): Promise<string> {
    const pixelRatio = 4
    const width = 4096
    const cBarPad = 40
    const { height: colorbarHeight, width: colorbarWidth } = colorbarDimensions(colorbarElement, width * 0.8, 300 - cBarPad)

    const aspectRatio = computeAspectRatioForInsets(insets)

    const height = Math.round(width / aspectRatio)

    const totalHeight = height + colorbarHeight + cBarPad

    const params = { width, height, pixelRatio, insetBorderColor: colors.mapInsetBorderColor }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = width
    canvas.height = totalHeight

    await Promise.all(maps.map(async (map, i) => {
        const inset = insets[i]
        await renderMap(ctx, map, inset, params)
    }))

    ctx.fillStyle = basemap.type === 'none' ? basemap.backgroundColor : colors.background
    ctx.fillRect(0, height, width, colorbarHeight + cBarPad) // Fill the entire colorbar area

    if (colorbarElement) {
        const colorbarCanvas = await screencapElement(colorbarElement, colorbarWidth, 1)

        ctx.drawImage(colorbarCanvas, (width - colorbarWidth) / 2, height + cBarPad / 2)
    }

    return canvas.toDataURL('image/png', 1.0)
}

function colorbarDimensions(colorbarElement: HTMLElement | undefined, maxWidth: number, maxHeight: number): { width: number, height: number } {
    if (colorbarElement === undefined) {
        return { width: 0, height: 0 }
    }
    let width = colorbarElement.offsetWidth
    let height = colorbarElement.offsetHeight
    {
        // do this no matter what, to fill the space
        const scale = maxHeight / height
        height = maxHeight
        width = width * scale
    }
    if (width > maxWidth) {
        // rescale if it is now too wide
        const scale = maxWidth / width
        width = maxWidth
        height = height * scale
    }
    return { width, height }
}

function filterOverlaps(inset: Inset, features: GeoJSON.Feature[]): GeoJSON.Feature[] {
    const bbox = inset.coordBox
    if (!inset.mainMap) {
        features = features.filter((poly) => {
            const bounds = boundingBox(poly.geometry)
            // Check if the polygon overlaps the inset bounds
            return bounds.getWest() < bbox[2] && bounds.getEast() > bbox[0]
                && bounds.getNorth() > bbox[1] && bounds.getSouth() < bbox[3]
        })
    }
    return features
}

// eslint-disable-next-line no-restricted-syntax -- Forward Ref
function _InsetMap({ inset, children }: { inset: Inset, children: ReactNode }, ref: React.Ref<MapRef>): ReactNode {
    const colors = useColors()

    return (
        <CommonMaplibreMap
            ref={ref}
            style={{
                position: 'absolute',
                left: `${inset.bottomLeft[0] * 100}%`,
                bottom: `${inset.bottomLeft[1] * 100}%`,
                width: `${(inset.topRight[0] - inset.bottomLeft[0]) * 100}%`,
                height: `${(inset.topRight[1] - inset.bottomLeft[1]) * 100}%`,
                border: !inset.mainMap ? `${insetBorderWidth}px solid ${colors.mapInsetBorderColor}` : `${mapBorderWidth}px solid ${colors.borderNonShadow}`,
                borderRadius: !inset.mainMap ? '0px' : `${mapBorderRadius}px`,
            }}
            attributionControl={false}
        >
            {children}
            <FitInset inset={inset} />
        </CommonMaplibreMap>
    )
}

function FitInset({ inset }: { inset: Inset }): ReactNode {
    const map = useMap().current!

    useEffect(() => {
        map.fitBounds(inset.coordBox, { animate: false })
    }, [inset, map])

    return null
}

// eslint-disable-next-line no-restricted-syntax -- Forward Ref
const InsetMap = React.forwardRef(_InsetMap)

interface Point {
    name: string

    fillColor: string
    fillOpacity: number
    radius: number

    meta?: Record<string, unknown>

}

async function pointsGeojson(geographyKind: typeof valid_geographies[number], universe: Universe, points: Point[]): Promise<GeoJSON.Feature[]> {
    const idxLink = indexLink(universe, geographyKind)
    const articles = await loadProtobuf(idxLink, 'ArticleOrderingList')
    const centroids = await loadCentroids(universe, geographyKind, articles.longnames)

    const nameToIndex = new Map(articles.longnames.map((r, i) => [r, i]))

    return points.map((point) => {
        const centroid = centroids[nameToIndex.get(point.name)!]

        return {
            type: 'Feature' as const,
            properties: { ...point, ...point.meta },
            geometry: {
                type: 'Point',
                coordinates: [centroid.lon!, centroid.lat!],
            },
        }
    })
}

async function polygonsGeojson(geographyKind: typeof valid_geographies[number], universe: Universe, polygons: Polygon[]): Promise<GeoJSON.Feature[]> {
    const universeIdx = universes_ordered.indexOf(universe)
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

    const nameToIndex = new Map(longnames.map((r, i) => [r, i]))

    return polygons.map((polygon) => {
        return {
            type: 'Feature' as const,
            properties: { ...polygon, ...polygon.meta },
            geometry: geometry(features[nameToIndex.get(polygon.name)!] as NormalizeProto<Feature>),
        }
    })
}

function exportAsGeoJSON(features: GeoJSON.Feature[]): string {
    return JSON.stringify(
        {
            type: 'FeatureCollection',
            features,
        },
    )
}

function colorbarStyleFromBasemap(basemap: Basemap): React.CSSProperties {
    switch (basemap.type) {
        case 'osm':
            return { }
        case 'none':
            return { backgroundColor: basemap.backgroundColor, color: basemap.textColor }
    }
}

interface EmpiricalRamp {
    ramp: Keypoints
    scale: ScaleInstance
    interpolations: number[]
    label: string
    unit?: UnitType
}

type RampToDisplay = { type: 'ramp', value: EmpiricalRamp } | { type: 'label', value: string }

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

export type MapEditorMode = 'uss' | 'insets'

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

    const mapGenerator = useOrderedResolve(useMemo(() => makeMapGenerator({ mapSettings }), [mapSettings]))

    const commonProps: CommonEditorProps = {
        mapSettings,
        setMapSettings: setMapSettingsWrapper,
        typeEnvironment,
        setMapEditorMode,
        mapGenerator: mapGenerator.result,
        loading: mapGenerator.loading,
    }

    return (
        <PageTemplate csvExportData={mapGenerator.result?.exportCSV}>
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
    mapGenerator: MapGenerator | undefined
    loading: boolean
}

function USSMapEditor({ mapSettings, setMapSettings, counts, typeEnvironment, setMapEditorMode, mapGenerator, loading }: CommonEditorProps & { counts: CountsByUT }): ReactNode {
    const ui = mapGenerator?.ui({ mode: 'uss', loading })

    return (
        <>
            <MapperSettings
                mapSettings={mapSettings}
                setMapSettings={setMapSettings}
                errors={mapGenerator?.errors ?? []}
                counts={counts}
                typeEnvironment={typeEnvironment}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5em' }}>
                <Export pngExport={ui?.exportPng} geoJSONExport={mapGenerator?.exportGeoJSON} />
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
            {ui?.node ?? <MapSkeleton />}
        </>

    )
}

function InsetsMapEditor({ mapSettings, setMapSettings, typeEnvironment, setMapEditorMode, mapGenerator, loading }: CommonEditorProps): ReactNode {
    const colors = useColors()

    const [insetEdits, setInsetEdits] = useState<InsetEdits>(new Map())

    const { addState, ui: undoRedoUi } = useUndoRedo(insetEdits, undefined, setInsetEdits, () => undefined)

    const editedInsets = getInsets(mapSettings, typeEnvironment)!.map((baseInset, i) => ({ ...baseInset, ...insetEdits.get(i) }))

    const ui = mapGenerator?.ui({
        loading,
        mode: 'insets',
        doEdit: (i, e) => {
            setInsetEdits((edits) => {
                const newEdits = new Map(edits)
                newEdits.set(i, { ...newEdits.get(i), ...e })
                addState(newEdits, undefined)
                return newEdits
            })
        },
        editedInsets,
    })

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
            {ui?.node ?? <MapSkeleton />}
            {undoRedoUi}
        </>
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
