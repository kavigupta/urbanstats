import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec'
import maplibregl from 'maplibre-gl'
import React, { CSSProperties, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { FullscreenControl, Layer, LngLatLike, MapRef, Source, useMap } from 'react-map-gl/maplibre'

import { Basemap, CommonMaplibreMap } from '../components/map-common'
import { ICoordinate } from '../utils/protos'

import { syauCategoryUnnamed } from './syau-categories'

const circleMarkerRadius = 20

/** GeoJSON / MapLibre feature properties are loosely typed at runtime; coerce to a finite number. */
function finiteNumber(value: unknown, fallback = 0): number {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
}

/**
 * Properties we attach to each centroid **leaf** in GeoJSON (`syau-map` builds these).
 */
export interface SyauCentroidLeafProperties {
    name?: string
    population?: number
    populationOrdinal?: number
    category?: number
    existence?: number
}

/**
 * `querySourceFeatures('centroids')`: our leaf props plus MapLibre cluster fields (`cluster`,
 * `cluster_id`) and aggregates (`namedCount`, `totalCount`, `popCat*`, …).
 */
export interface SyauCentroidQueryProperties extends SyauCentroidLeafProperties {
    cluster?: boolean
    // eslint-disable-next-line no-restricted-syntax -- not under our control
    cluster_id?: number | string
    namedCount?: number
    totalCount?: number
    [key: string]: unknown
}

/**
 * MapLibre `clusterProperties` for per-category population and place counts.
 * Category `0` is treated as the unnamed/default bucket; categories `1..n-1` are
 * summed into `namedCount` for cluster labels.
 */
function buildClusterProperties(numCategories: number): Record<string, unknown> {
    const props: Record<string, unknown> = {
        population: ['+', ['get', 'population']],
        existence: ['+', ['get', 'existence']],
    }
    for (let k = 0; k < numCategories; k++) {
        props[`popCat${k}`] = ['+', ['case', ['==', ['get', 'category'], k], ['get', 'population'], 0]]
        props[`countCat${k}`] = ['+', ['case', ['==', ['get', 'category'], k], ['get', 'existence'], 0]]
    }
    const namedParts: unknown[] = []
    for (let k = 1; k < numCategories; k++) {
        namedParts.push(['case', ['==', ['get', 'category'], k], ['get', 'existence'], 0])
    }
    props.namedCount = namedParts.length === 0
        ? 0
        : namedParts.length === 1
            ? namedParts[0]
            : ['+', ...namedParts]
    props.totalCount = ['+', ['get', 'existence']]
    return props
}

function circleColorMatchExpression(categoryColors: readonly string[]): ExpressionSpecification {
    const pairs: (number | string)[] = []
    for (let k = 0; k < categoryColors.length; k++) {
        pairs.push(k, categoryColors[k])
    }
    return [
        'match',
        ['get', 'category'],
        ...pairs,
        categoryColors[0],
    ] as unknown as ExpressionSpecification
}

function populationByCategoryFromProps(
    raw: SyauCentroidQueryProperties,
    numCategories: number,
    isCluster: boolean,
): number[] {
    const out: number[] = []
    for (let k = 0; k < numCategories; k++) {
        const key = `popCat${k}`
        const v = raw[key]
        if (isCluster) {
            out.push(finiteNumber(v))
        }
        else {
            const cat = Math.trunc(finiteNumber(raw.category))
            const p = finiteNumber(raw.population)
            out.push(cat === k ? p : 0)
        }
    }
    return out
}

/**
 * Props for the clustered centroid map (SYAU game map). Kept explicit so other
 * call sites can reuse the same map shell later.
 */
export interface SyauClusterMapProps {
    /** Point GeoJSON for the `centroids` source (SYAU feature properties on each point). */
    centroidsData: GeoJSON.FeatureCollection
    /** Same locations as `centroidsData`, used only for initial fitBounds. */
    mapBoundsCentroids: ICoordinate[]
    /**
     * Color for each category index (`0 .. length-1`). `clusterProperties` and the
     * invisible circle layer are sized for this length.
     */
    categoryColors: readonly string[]
    /** Outer map container style (default height 600px). */
    mapStyle?: CSSProperties
    /**
     * Fired whenever marker query results change — unclustered points currently visible
     * (used for Voronoi polygon highlights in SYAU).
     */
    onVisibleUnclusteredChange?: (polys: { name: string, category: number }[]) => void
    /** Rendered inside the map (e.g. layers that need `useMap()`). */
    children?: ReactNode
}

/**
 * Clustered GeoJSON centroids + HTML pie markers + invisible circle layer (category sync) + first zoom.
 */
export function SyauClusterMap(props: SyauClusterMapProps): ReactNode {
    const {
        centroidsData,
        mapBoundsCentroids,
        categoryColors,
        mapStyle,
        onVisibleUnclusteredChange,
        children,
    } = props

    const numCategories = categoryColors.length

    const clusterProperties = useMemo(
        () => buildClusterProperties(numCategories),
        [numCategories],
    )

    const [mapRef, setMapRef] = useState<MapRef | null>(null)
    const [markersOnScreen, setMarkersOnScreen] = useState(new Map<string, maplibregl.Marker>())
    const markersOnScreenRef = useRef(markersOnScreen)
    markersOnScreenRef.current = markersOnScreen

    const updateMarkers = (): void => {
        if (mapRef === null) {
            return
        }

        const newMarkers = new Map<string, maplibregl.Marker>()
        const newPolys: { name: string, category: number }[] = []

        const features = mapRef.querySourceFeatures('centroids')

        for (const feature of features) {
            const coords: LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as LngLatLike
            const featureProps = feature.properties as SyauCentroidQueryProperties

            const isCluster = featureProps.cluster === true
            const featureId = isCluster ? String(featureProps.cluster_id) : String(featureProps.name)

            const pops = populationByCategoryFromProps(featureProps, numCategories, isCluster)

            let text: string
            if (isCluster) {
                const namedCount = finiteNumber(featureProps.namedCount)
                const totalCount = finiteNumber(featureProps.totalCount)
                text = `${namedCount}/${totalCount}`
            }
            else {
                const category = Math.trunc(finiteNumber(featureProps.category, syauCategoryUnnamed))
                newPolys.push({
                    name: String(featureProps.name),
                    category,
                })
                text = category === syauCategoryUnnamed ? '?' : `#${featureProps.populationOrdinal}`
            }

            const html = multiCategoryPie(categoryColors, pops, circleMarkerRadius, text)

            const prevMarkers = markersOnScreenRef.current
            const existingMarker = prevMarkers.get(featureId)
            if (existingMarker !== undefined) {
                existingMarker.getElement().innerHTML = html
                newMarkers.set(featureId, existingMarker)
            }
            else {
                const el = document.createElement('div')
                el.innerHTML = html
                el.className = 'syau-marker'
                el.style.width = `${circleMarkerRadius * 2}px`
                el.style.height = `${circleMarkerRadius * 2}px`
                const marker = new maplibregl.Marker({
                    element: el,
                }).setLngLat(coords)

                marker.addTo(mapRef.getMap())

                newMarkers.set(featureId, marker)
            }
        }
        for (const [oldMarkerId, oldMarker] of markersOnScreenRef.current.entries()) {
            if (!newMarkers.has(oldMarkerId)) oldMarker.remove()
        }
        setMarkersOnScreen(newMarkers)
        newPolys.sort((a, b) => {
            if (a.name < b.name) return -1
            if (a.name > b.name) return 1
            return 0
        })
        onVisibleUnclusteredChange?.(newPolys)
    }

    return (
        <CommonMaplibreMap
            ref={setMapRef}
            onMove={updateMarkers}
            onData={updateMarkers}
            style={{ height: 600, ...mapStyle }}
        >
            <Basemap basemap={useMemo(() => ({ type: 'osm', noLabels: true }), [])} />
            <FullscreenControl position="top-left" />
            <Source
                id="centroids"
                type="geojson"
                data={centroidsData}
                cluster={true}
                clusterMaxZoom={14}
                clusterRadius={circleMarkerRadius * 2.5}
                clusterProperties={clusterProperties}
            />
            <Layer
                id="centroid_circle"
                type="circle"
                source="centroids"
                filter={['!=', 'cluster', true]}
                paint={{
                    'circle-color': circleColorMatchExpression(categoryColors),
                    'circle-radius': 0,
                }}
            />
            <FirstZoom centroids={mapBoundsCentroids} />
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

/**
 * Full pie: one wedge per category with positive population share (uses `categoryColors`).
 */
function multiCategoryPie(
    categoryColors: readonly string[],
    categoryPopulations: number[],
    radius: number,
    text: string,
): string {
    const total = categoryPopulations.reduce((a, b) => a + (Number.isFinite(b) && b > 0 ? b : 0), 0)
    const fallback = categoryColors[0]
    const sectors: string[] = []
    if (total <= 0) {
        sectors.push(`<circle cx="${radius}" cy="${radius}" r="${radius}" fill="${fallback}"></circle>`)
    }
    else {
        let startAngle = -Math.PI / 2
        for (let k = 0; k < categoryPopulations.length; k++) {
            const pop = categoryPopulations[k]
            if (!Number.isFinite(pop) || pop <= 0) continue
            const sectorAngle = (2 * Math.PI * pop) / total
            const endAngle = startAngle + sectorAngle
            sectors.push(singleSector(radius, startAngle, endAngle, categoryColors[k] ?? fallback))
            startAngle = endAngle
        }
    }

    const result = [
        '<div>',
        `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${radius * 2} ${radius * 2}">`,
        ...sectors,
        '</svg>',
        '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width: 100%; text-align: center; font-weight: 500" class="serif">',
        text,
        '</div>',
        '</div>',
    ]

    return result.join('')
}

function singleSector(radius: number, startAngle: number, endAngle: number, color2: string): string {
    const startx = radius + radius * Math.cos(startAngle)
    const starty = radius + radius * Math.sin(startAngle)
    const endx = radius + radius * Math.cos(endAngle)
    const endy = radius + radius * Math.sin(endAngle)
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
    return `<path d="M${radius},${radius} L${startx},${starty} A${radius},${radius} 0 ${largeArc},1 ${endx},${endy} z" fill="${color2}"></path>`
}

function optimizeWrapping(lons: number[]): number[] {
    const lonsAboutIDL = lons.map(lon => lon > 0 ? lon - 360 : lon)
    const range = (xs: number[]): number => Math.max(...xs) - Math.min(...xs)
    if (range(lons) < range(lonsAboutIDL)) {
        return lons
    }
    return lonsAboutIDL
}
