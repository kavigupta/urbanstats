import React, { ReactNode, useId, useMemo, useRef, useSyncExternalStore } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'

import valid_geographies from '../data/mapper/used_geographies'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { boundingBox, geometry } from '../map-partition'
import { Keypoints } from '../mapper/ramps'
import { Basemap, computeUSS, MapSettings } from '../mapper/settings/utils'
import { consolidatedShapeLink, indexLink } from '../navigation/links'
import { Colors } from '../page_template/color-themes'
import { useColors } from '../page_template/colors'
import { loadCentroids } from '../syau/load'
import { Universe } from '../universe'
import { DisplayResults } from '../urban-stats-script/Editor'
import { UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { doRender } from '../urban-stats-script/constants/color'
import { instantiate, ScaleInstance } from '../urban-stats-script/constants/scale'
import { EditorError } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { USSOpaqueValue } from '../urban-stats-script/types-values'
import { executeAsync } from '../urban-stats-script/workerManager'
import { furthestColor, interpolateColor } from '../utils/color'
import { computeAspectRatioForInsets } from '../utils/coordinates'
import { ConsolidatedShapes, Feature, IFeature } from '../utils/protos'
import { onWidthChange } from '../utils/responsive'
import { NormalizeProto } from '../utils/types'
import { UnitType } from '../utils/unit'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { CountsByUT } from './countsByArticleType'
import { CSVExportData, generateMapperCSVData } from './csv-export'
import { Statistic } from './display-stats'
import { Inset, ShapeSpec, ShapeType } from './map'
import { CommonMaplibreMap, firstLabelId, insetBorderWidth, Polygon } from './map-common'
import { MapEditorMode } from './mapper-panel'
import { mapBorderRadius, mapBorderWidth, screencapElement } from './screenshot'
import { renderMap } from './screenshot-map'

export function MapperPanel(props: { mapSettings: MapSettings, view: boolean, counts: CountsByUT }): ReactNode {
    if (props.view) {
        return <DisplayMap {...props.mapSettings} uss={computeUSS(props.mapSettings.script)} />
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

interface MapComponentProps {
    geographyKind: typeof valid_geographies[number]
    universe: Universe
    uss: UrbanStatsASTStatement | undefined
}

type MapUIProps = { mode: 'view' } | { mode: 'uss' } | { mode: 'insets' }

async function maybeMapUi({ mapSettings }: { mapSettings: MapSettings }): Promise<(props: MapUIProps) => { ui: ReactNode, exportPng?: () => void, exportGeoJSON?: () => void, exportCSV?: CSVExportData }> {
    if (mapSettings.geographyKind === undefined || mapSettings.universe === undefined) {
        return () => ({
            ui: <DisplayResults results={[{ kind: 'error', type: 'error', value: 'Select a Universe and Geography Kind', location: noLocation }]} editor={false} />,
        })
    }

    const stmts = computeUSS(mapSettings.script)

    const execResult = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: mapSettings.geographyKind, universe: mapSettings.universe }, stmts })

    if (execResult.resultingValue === undefined) {
        return () => ({
            ui: <DisplayResults results={execResult.error} editor={false} />,
        })
    }

    const mapResultMain = execResult.resultingValue.value
    const shapeType: ShapeType = mapResultMain.opaqueType === 'pMap' ? 'point' : 'polygon'
    const label = mapResultMain.value.label

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

    const csvData = generateMapperCSVData(mapResultMain, execResult.context)
    const csvFilename = `${mapSettings.geographyKind}-${mapSettings.universe}-data.csv`

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
    }
    else {
        // For regular cMap, use ramp and scale
        const cMap = mapResultMain.value
        const ramp = cMap.ramp
        const scale = instantiate(cMap.scale)
        const interpolations = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(scale.inverse)
        const furthest = furthestColor(ramp.map(x => x[1]))
        colors = cMap.data.map(
            val => interpolateColor(ramp, scale.forward(val), furthest),
        )
    }
    const specs = colors.map(
        // no outline, set color fill, alpha=1
        (color, i): ShapeSpec => {
            switch (shapeType) {
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
    // return {
    //     shapes: names.map((name, i) => ({
    //         name,
    //         spec: specs[i],
    //         meta: metas[i],
    //     })),
    //     zoomIndex: -1,
    // }

    return (
        <CommonMaplibreMap>

        </CommonMaplibreMap>
    )
}

async function mapUi({ mapResultMain, universe, geographyKind }:
{ mapResultMain: USSOpaqueValue & { opaqueType: 'cMap' | 'cMapRGB' | 'pMap' }
    universe: Universe, geographyKind: typeof valid_geographies[number]
}): Promise<(props: MapUIProps) => { ui: ReactNode, geoJSON: () => string, png: (colors: Colors) => Promise<string> }> {
    switch (mapResultMain.opaqueType) {
        case 'pMap':
            const pMap = mapResultMain.value
            const scale = instantiate(pMap.scale)
            const furthest = furthestColor(pMap.ramp.map(x => x[1]))

            const points: Point[] = Array.from(pMap.data.entries()).map(([i, dataValue]) => {
                return {
                    name: pMap.geo[i],
                    fillColor: interpolateColor(pMap.ramp, scale.forward(dataValue), furthest),
                    fillOpacity: 1,
                    radius: Math.sqrt(pMap.relativeArea[i]) * pMap.maxRadius,
                    meta: {
                        statistic: dataValue,
                    },
                }
            })

            const features = await pointsGeojson(geographyKind, universe, points)

            // Split up by inset

            // Filter by visible insets (if not in inset edit mode)

            // render inset maps

            // insets map component that renders insets

            const interpolations = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(scale.inverse)

            const empiricalRamp: RampToDisplay = { type: 'ramp', value: { ramp: pMap.ramp, interpolations, scale, label: pMap.label, unit: pMap.unit } }

            return (props) => {
                const insetMaps = pMap.insets.flatMap((inset, i) => {
                    const insetFeatures = filterOverlaps(inset, features)
                    if (insetFeatures.length === 0 && props.mode !== 'insets') {
                        return []
                    }
                    return [
                        { inset, map: (
                            <InsetMap key={i} inset={inset}>
                                <PointFeatureCollection features={insetFeatures} />
                            </InsetMap>
                        ) },
                    ]
                })

                const visibleInsets = insetMaps.map(({ inset }) => inset)

                const colorbarRef = React.createRef<HTMLDivElement>()

                return ({
                    ui: (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                        >
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
                                    ramp={empiricalRamp}
                                    basemap={pMap.basemap}
                                />
                            </div>
                        </div>

                    ),
                    geoJSON: () => exportAsGeoJSON(features),
                    png: colors =>
                        exportAsPng({ colors, colorbarElement: colorbarRef.current!, insets: visibleInsets, maps: mapsRef.current, basemap: pMap.basemap })
                    ,
                })
            }
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

function InsetMap({ inset, children }: { inset: Inset, children: ReactNode }): ReactNode {
    const colors = useColors()

    return (
        <CommonMaplibreMap style={{
            position: 'absolute',
            width: 'unset',
            left: `${inset.bottomLeft[0] * 100}%`,
            bottom: `${inset.bottomLeft[1] * 100}%`,
            right: `${inset.topRight[0] * 100}%`,
            border: !inset.mainMap ? `${insetBorderWidth}px solid ${colors.mapInsetBorderColor}` : `${mapBorderWidth}px solid ${colors.borderNonShadow}`,
            borderRadius: !inset.mainMap ? '0px' : `${mapBorderRadius}px`,
        }}
        >
            {children}
        </CommonMaplibreMap>
    )
}

function pointsId(id: string, kind: 'source' | 'fill' | 'outline'): string {
    return `points-${kind}-${id}`
}

function PointFeatureCollection({ features }: { features: GeoJSON.Feature[] }): ReactNode {
    const { current: map } = useMap()
    const id = useId()

    const labelId = useOrderedResolve(useMemo(() => map !== undefined ? firstLabelId(map) : Promise.resolve(undefined), [map]))

    const collection: GeoJSON.FeatureCollection = useMemo(() => ({
        type: 'FeatureCollection',
        features,
    }), [features])

    return (
        <>
            <Source id={pointsId(id, 'source')} type="geojson" data={collection} />
            <Layer
                id={pointsId(id, 'fill')}
                type="circle"
                source={pointsId(id, 'source')}
                paint={{
                    'circle-color': ['get', 'fillColor'],
                    'circle-opacity': ['get', 'fillOpacity'],
                    'circle-radius': ['get', 'radius'],
                }}
                beforeId={labelId}
            />
        </>
    )
}

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
