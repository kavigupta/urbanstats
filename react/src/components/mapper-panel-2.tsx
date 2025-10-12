import React, { ReactNode, useMemo } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'

import valid_geographies from '../data/mapper/used_geographies'
import universes_ordered from '../data/universes_ordered'
import { loadProtobuf } from '../load_json'
import { geometry } from '../map-partition'
import { Basemap, computeUSS, MapSettings } from '../mapper/settings/utils'
import { consolidatedShapeLink, indexLink } from '../navigation/links'
import { loadCentroids } from '../syau/load'
import { Universe } from '../universe'
import { DisplayResults } from '../urban-stats-script/Editor'
import { UrbanStatsASTStatement } from '../urban-stats-script/ast'
import { doRender } from '../urban-stats-script/constants/color'
import { instantiate } from '../urban-stats-script/constants/scale'
import { EditorError } from '../urban-stats-script/editor-utils'
import { noLocation } from '../urban-stats-script/location'
import { USSOpaqueValue } from '../urban-stats-script/types-values'
import { executeAsync } from '../urban-stats-script/workerManager'
import { furthestColor, interpolateColor } from '../utils/color'
import { ConsolidatedShapes, Feature, IFeature } from '../utils/protos'
import { NormalizeProto } from '../utils/types'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { CountsByUT } from './countsByArticleType'
import { CSVExportData, generateMapperCSVData } from './csv-export'
import { Inset, ShapeSpec, ShapeType } from './map'
import { CommonMaplibreMap, firstLabelId, Polygon } from './map-common'

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

async function getDisplayedMap({ mapSettings }: { mapSettings: MapSettings }): Promise<{ ui: ReactNode, exportPng?: () => void, exportGeoJSON?: () => void, exportCSV?: CSVExportData }> {
    if (mapSettings.geographyKind === undefined || mapSettings.universe === undefined) {
        return {
            ui: <DisplayResults results={[{ kind: 'error', type: 'error', value: 'Select a Universe and Geography Kind', location: noLocation }]} editor={false} />,
        }
    }

    const stmts = computeUSS(mapSettings.script)

    const execResult = await executeAsync({ descriptor: { kind: 'mapper', geographyKind: mapSettings.geographyKind, universe: mapSettings.universe }, stmts })

    if (execResult.resultingValue === undefined) {
        return {
            ui: <DisplayResults results={execResult.error} editor={false} />,
        }
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

async function mapperFeatures({ mapResultMain, universe, geographyKind }: { mapResultMain: USSOpaqueValue & { opaqueType: 'cMap' | 'cMapRGB' | 'pMap' }, universe: Universe, geographyKind: typeof valid_geographies[number] }): Promise<{ ui: React.ReactNode, geoJSON: () => string }> {
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

            // render inset maps

            return {
                ui: null,
                geoJSON: () => exportAsGeoJSON(features),
            }
    }
}

function pointsId(id: string, kind: 'source' | 'fill' | 'outline'): string {
    return `points-${kind}-${id}`
}

function PointFeatureCollection({ features, id }: { features: GeoJSON.Feature[], id: string }): ReactNode {
    const { current: map } = useMap()

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
