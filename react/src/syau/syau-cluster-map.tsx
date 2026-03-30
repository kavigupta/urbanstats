import maplibregl from 'maplibre-gl'
import React, { ReactNode, useEffect, useMemo, useState } from 'react'
import { FullscreenControl, Layer, LngLatLike, Map as MapGL, MapProps, MapRef, Source, useMap } from 'react-map-gl/maplibre'

import { Basemap, CommonMaplibreMap, urbanStatsLayerPrefix } from '../components/map-common'
import { Basemap as BasemapSpec } from '../mapper/settings/utils'
import { TestUtils } from '../utils/TestUtils'
import { assert } from '../utils/defensive'
import { ICoordinate } from '../utils/protos'

type PieChartSizeCategoryKey = `pieChartSizeForCategory${number}`
type CountCategoryKey = `countCategory${number}`

/** GeoJSON feature properties for clustered SYAU centroids (cluster aggregates + point props). */
export type ClusterFeatureProperties = (
    { [key in PieChartSizeCategoryKey]: number } &
    { [key in CountCategoryKey]: number } &
    // eslint-disable-next-line no-restricted-syntax -- cluster_id comes from maplibre and is out of our control
    ({ cluster: true, cluster_id: string } | { cluster: undefined, idxIntoCentroids: number })
)

interface ClusterMapProps {
    /** Centroid long/lat coordinates. */
    centroids: ICoordinate[]
    /** Categories for each centroid, indexed into `categoryColors`. */
    categories: number[]
    /** Pie chart sizes for each centroid, same order as `categories`. */
    pieChartSizeFor: number[]
    /** Colors for each category, indexed by elements of `categories`. */
    categoryColors: string[]
    /** Outer map container style (default height 600px). */
    /**
     * Fired whenever marker query results change — unclustered points currently visible
     * (used for Voronoi polygon highlights in SYAU).
     */
    onVisibleUnclusteredChange?: (polys: { idxIntoCentroids: number, category: number }[]) => void
    /** Label for a cluster marker (aggregated counts). */
    clusterMarkerLabel: (featureProps: ClusterFeatureProperties & { cluster: true }) => string
    /** Label for an unclustered point marker. */
    unclusteredMarkerLabel: (featureProps: ClusterFeatureProperties & { cluster: undefined }) => string
    /** Rendered inside the map (e.g. layers that need `useMap()`). */
    children?: ReactNode
    /** Maximum radius of each cluster, in pixels. */
    maxClusterRadius: number
    /** Compute relative area relative to the largest area */
    computeRelativeArea: (area: number, maxArea: number) => number
    /** Optional map props for embedding in other layouts. */
    mapLibreProps?: Partial<MapProps>
    /** Optional map ref passthrough. */
    mapRef?: React.Ref<MapRef>
    /** Optional basemap override. */
    basemap?: BasemapSpec
    /** Optional cluster controls. */
    clusterRadius?: number
    clusterMaxZoom?: number
}

interface ClusterMapElement {
    featureId: string
    html: (radius: number) => string
    coords: LngLatLike
    totalPieChartSize: number
}

/**
 * Clustered GeoJSON centroids + HTML pie markers + invisible hit-test layer + first zoom.
 * Extracted from SYAU as a reusable map module.
 */
export function ClusterMap(props: ClusterMapProps): ReactNode {
    const {
        categories,
        pieChartSizeFor,
        centroids,
        categoryColors,
        onVisibleUnclusteredChange,
        clusterMarkerLabel,
        unclusteredMarkerLabel,
        children,
        maxClusterRadius,
    } = props

    const [mapRef, setMapRef] = useState<MapRef | null>(null)
    const [markersOnScreen, setMarkersOnScreen] = useState(new Map<string, maplibregl.Marker>())

    const updateMarkers = (): void => {
        if (mapRef === null) {
            return
        }

        const newUnclustered: { idxIntoCentroids: number, category: number }[] = []

        const features = mapRef.querySourceFeatures('centroids')

        const elements = []

        const seen = new Set<string>()

        for (const feature of features) {
            const coords: LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as LngLatLike
            const featureProps = feature.properties as ClusterFeatureProperties
            const featureId = featureProps.cluster ? featureProps.cluster_id : featureProps.idxIntoCentroids.toString()

            if (seen.has(featureId)) {
                continue
            }
            seen.add(featureId)

            const text = featureProps.cluster ? clusterMarkerLabel(featureProps) : unclusteredMarkerLabel(featureProps)
            if (!featureProps.cluster) {
                const category = categoryColors.findIndex((_, idx) => featureProps[`pieChartSizeForCategory${idx}`] > 0)
                assert(category !== -1, 'No category found')
                newUnclustered.push({
                    idxIntoCentroids: featureProps.idxIntoCentroids,
                    category,
                })
            }
            const totalPieChartSize = categoryColors.reduce((sum, _, idx) => sum + featureProps[`pieChartSizeForCategory${idx}`], 0)

            const element: ClusterMapElement = {
                featureId,
                html: (r: number) => circleSector(
                    categoryColors,
                    categoryColors.map((_, idx) => featureProps[`pieChartSizeForCategory${idx}`] / totalPieChartSize * 2 * Math.PI),
                    r,
                    text,
                ),
                coords,
                totalPieChartSize,
            }
            elements.push(element)
        }
        const maxPieChartSize = Math.max(...elements.map(e => e.totalPieChartSize), 0)
        const newMarkers = new Map<string, maplibregl.Marker>()
        for (const element of elements) {
            const existingMarker = markersOnScreen.get(element.featureId)
            const radius = maxClusterRadius * Math.sqrt(props.computeRelativeArea(element.totalPieChartSize, maxPieChartSize))
            const html = element.html(radius)
            if (existingMarker !== undefined) {
                existingMarker.getElement().innerHTML = html
                newMarkers.set(element.featureId, existingMarker)
            }
            else {
                const el = document.createElement('div')
                el.innerHTML = html
                el.className = 'syau-marker'
                el.style.width = `${2 * radius}px`
                el.style.height = `${2 * radius}px`
                const marker = new maplibregl.Marker({
                    element: el,
                }).setLngLat(element.coords)

                newMarkers.set(element.featureId, marker)
            }
        }
        // synchronize
        for (const [oldMarkerId, oldMarker] of markersOnScreen.entries()) {
            if (!newMarkers.has(oldMarkerId)) oldMarker.remove()
        }
        for (const [newMarkerId, newMarker] of newMarkers.entries()) {
            if (!markersOnScreen.has(newMarkerId)) {
                markersOnScreen.set(newMarkerId, newMarker)
                newMarker.addTo(mapRef.getMap())
            }
        }
        setMarkersOnScreen(newMarkers)
        newUnclustered.sort((a, b) => {
            if (a.idxIntoCentroids < b.idxIntoCentroids) return -1
            if (a.idxIntoCentroids > b.idxIntoCentroids) return 1
            return 0
        })
        onVisibleUnclusteredChange?.(newUnclustered)
    }

    const clusterProperties: Record<string, unknown> = {}
    for (let i = 0; i < categoryColors.length; i++) {
        clusterProperties[`countCategory${i}`] = ['+', ['get', `countCategory${i}`]]
        clusterProperties[`pieChartSizeForCategory${i}`] = ['+', ['get', `pieChartSizeForCategory${i}`]]
    }

    const defaultBasemap: BasemapSpec = useMemo(() => TestUtils.shared.isTesting
        // eslint-disable-next-line no-restricted-syntax -- just for testing
        ? { type: 'none', backgroundColor: 'white', textColor: 'black' } satisfies BasemapSpec
        : { type: 'osm', noLabels: true } satisfies BasemapSpec,
    [])
    const basemap = props.basemap ?? defaultBasemap

    const centroidsData = useMemo(() => {
        return {
            type: 'FeatureCollection',
            features: centroids.map((c, idx) => {
                const properties: Record<string, unknown> = {
                    idxIntoCentroids: idx,
                }
                for (let i = 0; i < categoryColors.length; i++) {
                    properties[`pieChartSizeForCategory${i}`] = categories[idx] === i ? pieChartSizeFor[idx] : 0
                    properties[`countCategory${i}`] = categories[idx] === i ? 1 : 0
                }
                return {
                    type: 'Feature',
                    properties,
                    geometry: {
                        type: 'Point',
                        coordinates: [c.lon!, c.lat!],
                    },
                }
            }),
        } satisfies GeoJSON.FeatureCollection
    }, [centroids, categories, pieChartSizeFor, categoryColors.length])

    return (
        <CommonMaplibreMap
            ref={(instance) => {
                setMapRef(instance)
                if (typeof props.mapRef === 'function') {
                    props.mapRef(instance)
                }
            }}
            canvasContextAttributes={{
                preserveDrawingBuffer: true,
            }}
            onMove={updateMarkers}
            onData={updateMarkers}
            {...props.mapLibreProps}
            style={{ height: 600, ...props.mapLibreProps?.style }}
        >
            <Basemap basemap={basemap} />
            <FullscreenControl position="top-left" />
            <Source
                id="centroids"
                type="geojson"
                data={centroidsData}
                cluster={true}
                clusterMaxZoom={props.clusterMaxZoom ?? 14}
                clusterRadius={props.clusterRadius ?? maxClusterRadius * 2.5}
                clusterProperties={clusterProperties}
            />
            {/*
              * MapLibre needs at least one layer using this source for clustering to be computed and
              * for querySourceFeatures to return features; this circle layer is invisible
              * (radius 0) but keeps that pipeline active
              */}
            <Layer
                id={`${urbanStatsLayerPrefix}-centroid-placeholders`}
                type="circle"
                source="centroids"
                filter={['!=', 'cluster', true]}
                paint={{ 'circle-radius': 0 }}
            />
            <FirstZoom centroids={centroids} />
            {children}
        </CommonMaplibreMap>
    )
}

function FirstZoom(props: { centroids: ICoordinate[] }): ReactNode {
    const map = useMap().current!

    useEffect(() => {
        const longs = optimizeWrapping(props.centroids.map(c => c.lon!))
        const lats = props.centroids.map(c => c.lat!)
        let minLon = Math.min(...longs)
        let minLat = Math.min(...lats)
        let maxLon = Math.max(...longs)
        let maxLat = Math.max(...lats)
        const lonRange = maxLon - minLon
        const latRange = maxLat - minLat
        const padPct = 0.1
        minLon -= lonRange * padPct
        minLat -= latRange * padPct
        maxLon += lonRange * padPct
        maxLat += latRange * padPct
        const bounds = [[minLon, minLat], [maxLon, maxLat]] as [[number, number], [number, number]]
        map.fitBounds(bounds, { animate: false })
    }, [props.centroids, map])

    return null
}

function circleSector(colors: string[], sizeAngleEach: number[], radius: number, text: string): string {
    let startAngle = -Math.PI / 2 // offset so 0% starts at top (12 o'clock)
    const singleSectors = []
    for (let i = 0; i < colors.length; i++) {
        const [sectors, endAngle] = sectorsFor(radius, startAngle, sizeAngleEach[i], colors[i])
        singleSectors.push(...sectors)
        startAngle = endAngle
    }
    const result = [
        '<div>',
        `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${radius * 2} ${radius * 2}">`,
        ...singleSectors,
        '</svg>',
        '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width: 100%; text-align: center; font-weight: 500" class="serif">',
        text,
        '</div>',
        '</div>',
    ]

    return result.join('')
}

function sectorsFor(radius: number, startAngle: number, sizeAngle: number, color2: string): [string[], number] {
    // pad by 1 degree to ensure no gaps
    const singleSectors = []
    const target = startAngle + sizeAngle
    let endAngle = Math.min(target, startAngle + Math.PI / 2)
    for (let i = 0; i < 4; i++) {
        singleSectors.push(singleSector(radius, startAngle, endAngle, color2))
        if (endAngle === target) {
            break
        }
        startAngle = endAngle
        endAngle = Math.min(target, startAngle + Math.PI / 2)
    }
    return [singleSectors, endAngle]
}

function singleSector(radius: number, startAngle: number, endAngle: number, color2: string): string {
    const pad = (endAngle - startAngle) * 0.01
    const startx = radius + radius * Math.cos(startAngle - pad)
    const starty = radius + radius * Math.sin(startAngle - pad)
    const endx = radius + radius * Math.cos(endAngle + pad)
    const endy = radius + radius * Math.sin(endAngle + pad)
    return `<path d="M${radius},${radius} L${startx},${starty} A${radius},${radius} 1 0,1 ${endx},${endy} z" fill="${color2}"></path>`
}

function optimizeWrapping(lons: number[]): number[] {
    const lonsAboutIDL = lons.map(lon => lon > 0 ? lon - 360 : lon)
    const range = (xs: number[]): number => Math.max(...xs) - Math.min(...xs)
    if (range(lons) < range(lonsAboutIDL)) {
        return lons
    }
    return lonsAboutIDL
}
