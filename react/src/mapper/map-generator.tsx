import React, { ReactNode, useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import ReactDOMClient from 'react-dom/client'
import { MapRef } from 'react-map-gl/maplibre'

import { CSVExportData, generateMapperCSVData } from '../components/csv-export'
import { Basemap as BasemapComponent, PointFeatureCollection, Polygon, PolygonFeatureCollection } from '../components/map-common'
import { screencapElement } from '../components/screenshot'
import { renderMap } from '../components/screenshot-map'
import valid_geographies from '../data/mapper/used_geographies'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { boundingBox, geometry } from '../map-partition'
import { consolidatedShapeLink, indexLink } from '../navigation/links'
import { LongLoad } from '../navigation/loading'
import { Colors } from '../page_template/color-themes'
import { loadCentroids } from '../syau/load'
import { Universe } from '../universe'
import { getAllParseErrors } from '../urban-stats-script/ast'
import { doRender } from '../urban-stats-script/constants/color-utils'
import { Inset } from '../urban-stats-script/constants/insets'
import { instantiate } from '../urban-stats-script/constants/scale'
import { EditorError } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { USSOpaqueValue } from '../urban-stats-script/types-values'
import { loadInsets } from '../urban-stats-script/worker'
import { executeAsync } from '../urban-stats-script/workerManager'
import { furthestColor, interpolateColor } from '../utils/color'
import { computeAspectRatioForInsets } from '../utils/coordinates'
import { assert } from '../utils/defensive'
import { ConsolidatedShapes, Feature, ICoordinate } from '../utils/protos'
import { NormalizeProto } from '../utils/types'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { Colorbar, RampToDisplay } from './components/Colorbar'
import { InsetMap } from './components/InsetMap'
import { Basemap, computeUSS, MapSettings } from './settings/utils'

type EditMultipleInsets = (index: number, newInset: Partial<Inset>) => void
interface EditInsets {
    modify: EditMultipleInsets
    editedInsets: Inset[]
    add: () => void
    delete: (i: number) => void
    duplicate: (i: number) => void
    moveUp: (i: number) => void
    moveDown: (i: number) => void
}

const mapUpdateInterval = 500

export function useMapGenerator({ mapSettings }: { mapSettings: MapSettings }): MapGenerator {
    const cache = useRef<MapCache>({})
    const updateTime = useRef(Date.now())

    const [currentGenerator, setCurrentGenerator] = useState<Promise<MapGenerator<{ loading: boolean }>>>(() => makeMapGenerator({ mapSettings, cache: cache.current, previousGenerator: undefined }))

    useEffect(() => {
        const timeSinceMapUpdate = Date.now() - updateTime.current
        if (timeSinceMapUpdate > mapUpdateInterval) {
            updateTime.current = Date.now()
            setCurrentGenerator(previousGenerator => makeMapGenerator({ mapSettings, cache: cache.current, previousGenerator }))
            return
        }
        else {
            updateTime.current = Date.now()
            const timeout = setTimeout(() => {
                setCurrentGenerator(previousGenerator => makeMapGenerator({ mapSettings, cache: cache.current, previousGenerator }))
            }, mapUpdateInterval - timeSinceMapUpdate)
            return () => {
                clearTimeout(timeout)
            }
        }
    }, [mapSettings]) // Do not change this effect list!!

    const { result, loading } = useOrderedResolve(currentGenerator)

    return result !== undefined
        ? {
                ...result,
                ui: props => result.ui({ ...props, loading }),
            }
        : {
                ui: () => ({ node: <EmptyMapLayout universe={mapSettings.universe} loading={loading} /> }),
                errors: [],
            }
}

type MapUIProps<T> = T & ({ mode: 'view' } | { mode: 'uss' } | { mode: 'insets', editInsets: EditInsets })

export interface MapGenerator<T = unknown> {
    ui: (props: MapUIProps<T>) => { node: ReactNode, exportPng?: (colors: Colors) => Promise<string> }
    exportGeoJSON?: () => string
    exportCSV?: CSVExportData
    errors: EditorError[]
}

async function makeMapGenerator({ mapSettings, cache, previousGenerator }: { mapSettings: MapSettings, cache: MapCache, previousGenerator: Promise<MapGenerator<{ loading: boolean }>> | undefined }): Promise<MapGenerator<{ loading: boolean }>> {
    const emptyMap = ({ loading }: { loading: boolean }): { node: ReactNode } => ({ node: <EmptyMapLayout universe={mapSettings.universe} loading={loading} /> })

    if (mapSettings.geographyKind === undefined || mapSettings.universe === undefined) {
        return {
            ui: emptyMap,
            errors: [{ kind: 'error', type: 'error', value: 'Select a Universe and Geography Kind', location: noLocation }],
        }
    }

    const stmts = computeUSS(mapSettings.script)

    const parseErrors = getAllParseErrors(stmts)
    if (parseErrors.length > 0) {
        const prev = await previousGenerator
        return {
            ...prev,
            ui: prev?.ui ?? emptyMap,
            errors: parseErrors.map(e => ({ ...e, kind: 'error' })),
        }
    }

    const execResult = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: mapSettings.geographyKind, universe: mapSettings.universe }, stmts })

    if (execResult.resultingValue === undefined) {
        const prev = await previousGenerator
        return {
            ...prev,
            ui: prev?.ui ?? emptyMap,
            errors: execResult.error,
        }
    }

    const mapResultMain = execResult.resultingValue.value

    const csvData = generateMapperCSVData(mapResultMain, execResult.context)
    const csvFilename = `${mapSettings.geographyKind}-${mapSettings.universe}-data.csv`

    const { features, mapChildren, ramp } = await loadMapResult({ mapResultMain, universe: mapSettings.universe, geographyKind: mapSettings.geographyKind, cache })

    return {
        errors: execResult.error,
        exportCSV: {
            csvData,
            csvFilename,
        },
        exportGeoJSON: () => exportAsGeoJSON(features),
        ui: (props) => {
            const mapsRef: (MapRef | null)[] = []

            const mapsContainerRef = React.createRef<HTMLDivElement>()

            const insetsFeatures = (props.mode === 'insets' ? props.editInsets.editedInsets : mapResultMain.value.insets).flatMap((inset) => {
                const insetFeatures = filterOverlaps(inset, features)
                if (insetFeatures.length === 0 && props.mode !== 'insets') {
                    return []
                }
                return [{
                    inset,
                    insetFeatures,
                }]
            })

            const insetMaps = insetsFeatures.map(({ inset, insetFeatures }, i, insets) => {
                return (
                    <InsetMap
                        i={i}
                        key={i}
                        inset={inset}
                        ref={e => mapsRef[i] = e}
                        container={mapsContainerRef}
                        numInsets={insets.length}
                        editInset={props.mode === 'insets'
                            ? {
                                    modify: (newInset: Partial<Inset>) => { props.editInsets.modify(i, newInset) },
                                    delete: () => { props.editInsets.delete(i) },
                                    duplicate: () => { props.editInsets.duplicate(i) },
                                    add: props.editInsets.add,
                                    moveUp: () => { props.editInsets.moveUp(i) },
                                    moveDown: () => { props.editInsets.moveDown(i) },
                                }
                            : undefined}
                    >
                        {mapChildren(insetFeatures, ['uss', 'view'].includes(props.mode))}
                    </InsetMap>
                )
            })

            const visibleInsets = insetsFeatures.map(({ inset }) => inset)

            const colorbar = (
                <Colorbar
                    ramp={ramp}
                    basemap={mapResultMain.value.basemap}
                />
            )

            return {
                node: (
                    <MapLayout
                        maps={insetMaps}
                        loading={props.loading}
                        colorbar={colorbar}
                        aspectRatio={computeAspectRatioForInsets(visibleInsets)}
                        mapsContainerRef={mapsContainerRef}
                    />
                ),
                exportPng: colors =>
                    exportAsPng({ colors, colorbar, insets: visibleInsets, maps: mapsRef.map(r => r!.getMap()), basemap: mapResultMain.value.basemap }),
            }
        },
    }
}

function MapLayout({ maps, colorbar, loading, mapsContainerRef, aspectRatio }: {
    maps: ReactNode
    colorbar: ReactNode
    loading: boolean
    mapsContainerRef?: React.Ref<HTMLDivElement>
    aspectRatio: number
}): ReactNode {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            minHeight: 0, // https://stackoverflow.com/questions/36230944/prevent-flex-items-from-overflowing-a-container/66689926#66689926
        }}
        >
            <RelativeLoader loading={loading} />
            <div style={{ maxHeight: '90%', width: '100%' }}>
                <div
                    ref={mapsContainerRef}
                    style={{
                        aspectRatio,
                        position: 'relative',
                        maxHeight: '100%',
                        margin: 'auto',
                    }}
                >
                    {maps}
                </div>
            </div>
            <div style={{ height: '8%', width: '100%' }}>
                {colorbar}
            </div>
        </div>
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

function EmptyMapLayout({ universe, loading }: { universe?: Universe, loading: boolean }): ReactNode {
    const insets = loadInsets(universe ?? 'world')

    return (
        <MapLayout
            maps={insets.map((inset, i) => (
                <InsetMap
                    i={i}
                    key={i}
                    inset={inset}
                    container={React.createRef()}
                    numInsets={insets.length}
                >
                    {null}
                </InsetMap>
            ))}
            loading={loading}
            colorbar={null}
            aspectRatio={computeAspectRatioForInsets(insets)}
        />
    )
}

async function loadMapResult({ mapResultMain: { opaqueType, value }, universe, geographyKind, cache }:
{
    mapResultMain: USSOpaqueValue & { opaqueType: 'cMap' | 'cMapRGB' | 'pMap' }
    universe: Universe
    geographyKind: typeof valid_geographies[number]
    cache: MapCache
}): Promise<{ features: GeoJSON.Feature[], mapChildren: (fs: GeoJSON.Feature[], clickable: boolean) => ReactNode, ramp: RampToDisplay }> {
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
                r,
                g: value.dataG[i],
                b: value.dataB[i],
                a: 1,
            }))
            ramp = { type: 'label', value: value.label }
            break
    }

    let features: GeoJSON.Feature[]
    let mapChildren: (fs: GeoJSON.Feature[], clickable: boolean) => ReactNode
    switch (opaqueType) {
        case 'pMap':
            const points: Point[] = Array.from(value.data.entries()).map(([i, dataValue]) => {
                return {
                    name: value.geo[i],
                    fillColor: colors[i],
                    fillOpacity: 1,
                    radius: Math.sqrt(value.relativeArea[i]) * value.maxRadius,
                    statistic: dataValue,
                }
            })

            features = await pointsGeojson(geographyKind, universe, points, cache)

            mapChildren = (fs, clickable) => <PointFeatureCollection features={fs} clickable={clickable} />

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
                    ...meta,
                }
            })

            features = await polygonsGeojson(geographyKind, universe, polys, cache)

            mapChildren = (fs, clickable) => <PolygonFeatureCollection features={fs} clickable={clickable} />

            break
    }

    return {
        features,
        mapChildren: (fs, clickable) => (
            <>
                {mapChildren(fs, clickable)}
                <BasemapComponent basemap={value.basemap} />
            </>
        ),
        ramp,
    }
}

async function exportAsPng({
    colors,
    colorbar,
    insets,
    maps,
    basemap,
}: {
    colorbar: ReactNode
    colors: Colors
    insets: Inset[]
    maps: maplibregl.Map[]
    basemap: Basemap
}): Promise<string> {
    const pixelRatio = 4
    const width = 4096
    const cBarPad = 40
    const colorbarScale = 0.75

    const colorbarRender = await renderColorbar(colorbar, width * 0.8, pixelRatio * colorbarScale, cBarPad)

    const aspectRatio = computeAspectRatioForInsets(insets)

    const height = Math.round(width / aspectRatio)

    const totalHeight = height + (colorbarRender.height > 0 ? colorbarRender.height + cBarPad : 0)

    const params = { width, height, pixelRatio, insetBorderColor: colors.mapInsetBorderColor }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    canvas.width = width
    canvas.height = totalHeight

    await Promise.all(maps.map(async (map, i) => {
        const inset = insets[i]
        await renderMap(ctx, map, inset, params)
    }))

    if (colorbarRender.height > 0) {
        ctx.fillStyle = basemap.type === 'none' ? basemap.backgroundColor : colors.background
        ctx.fillRect(0, height, width, colorbarRender.height + cBarPad) // Fill the entire colorbar area
        ctx.drawImage(colorbarRender.canvas, (width - colorbarRender.width) / 2, height + cBarPad / 2, colorbarRender.width, colorbarRender.height)
    }

    return canvas.toDataURL('image/png', 1.0)
}

async function renderColorbar(colorbar: ReactNode, renderColorbarWidth: number, pixelRatio: number, cBarPad: number): Promise<{ width: number, height: number, canvas: HTMLCanvasElement }> {
    const elem = document.createElement('div')
    document.body.appendChild(elem)

    const root = ReactDOMClient.createRoot(elem)

    const colorbarElement = React.createRef<HTMLDivElement>()

    ReactDOM.flushSync(() => {
        root.render(
            <div ref={colorbarElement} style={{ width: renderColorbarWidth / pixelRatio }}>
                { colorbar }
            </div>,
        )
    })

    assert(colorbarElement.current !== null, 'Colorbar Element ref was not assigned')

    const colorbarCanvas = await screencapElement(colorbarElement.current, renderColorbarWidth, 1)

    root.unmount()

    elem.remove()

    return {
        canvas: colorbarCanvas,
        ...colorbarDimensions(renderColorbarWidth, 500 - cBarPad, colorbarCanvas.width, colorbarCanvas.height),
    }
}

function colorbarDimensions(maxWidth: number, maxHeight: number, width: number, height: number): { width: number, height: number } {
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

interface MapCache {
    geo?: { universe: Universe, geographyKind: typeof valid_geographies[number] } & (
        { type: 'points', centroidsByName: Map<string, ICoordinate> }
        | { type: 'polygons', polygonsByName: Map<string, GeoJSON.Geometry> }
    )
}

interface Point {
    name: string

    fillColor: string
    fillOpacity: number
    radius: number

    [meta: string]: unknown

}

async function pointsGeojson(geographyKind: typeof valid_geographies[number], universe: Universe, points: Point[], cache: MapCache): Promise<GeoJSON.Feature[]> {
    if (cache.geo?.type !== 'points' || cache.geo.universe !== universe || cache.geo.geographyKind !== geographyKind) {
        const idxLink = indexLink(universe, geographyKind)
        const articles = await loadProtobuf(idxLink, 'ArticleOrderingList')
        const centroids = await loadCentroids(universe, geographyKind, articles.longnames)

        const centroidsByName = new Map(articles.longnames.map((r, i) => [r, centroids[i]]))
        cache.geo = {
            type: 'points',
            universe,
            geographyKind,
            centroidsByName,
        }
    }

    const geo = cache.geo

    return points.map((point) => {
        const centroid = geo.centroidsByName.get(point.name)!

        return {
            type: 'Feature' as const,
            properties: { ...point },
            geometry: {
                type: 'Point',
                coordinates: [centroid.lon!, centroid.lat!],
            },
        }
    })
}

async function polygonsGeojson(geographyKind: typeof valid_geographies[number], universe: Universe, polygons: Polygon[], cache: MapCache): Promise<GeoJSON.Feature[]> {
    if (cache.geo?.type !== 'polygons' || cache.geo.universe !== universe || cache.geo.geographyKind !== geographyKind) {
        const universeIdx = universes_ordered.indexOf(universe)
        const shapes = (await loadProtobuf(consolidatedShapeLink(geographyKind), 'ConsolidatedShapes')) as NormalizeProto<ConsolidatedShapes>
        const polygonsByName = new Map<string, GeoJSON.Geometry>()
        for (let i = 0; i < shapes.longnames.length; i++) {
            if (shapes.universes[i].universeIdxs.includes(universeIdx)) {
                polygonsByName.set(shapes.longnames[i], geometry(shapes.shapes[i] as NormalizeProto<Feature>))
            }
        }
        cache.geo = {
            type: 'polygons',
            universe,
            geographyKind,
            polygonsByName,
        }
    }

    const geo = cache.geo

    return polygons.map((polygon) => {
        return {
            type: 'Feature' as const,
            properties: { ...polygon },
            geometry: geo.polygonsByName.get(polygon.name)!,
        }
    })
}

function exportAsGeoJSON(features: GeoJSON.Feature[]): string {
    return JSON.stringify(
        {
            type: 'FeatureCollection',
            features,
        },
        null,
        2,
    )
}
