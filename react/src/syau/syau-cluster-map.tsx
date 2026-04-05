import maplibregl from 'maplibre-gl'
import React, { ReactNode, memo, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FullscreenControl, Layer, MapProps, MapRef, Source, useMap } from 'react-map-gl/maplibre'

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
    /** Apply a global opacity multiplier to marker HTML/SVG. */
    markerOpacity?: number
    /** Compute relative area relative to the largest area */
    computeRelativeArea: (area: number, maxArea: number) => number
    /** Optional map props for embedding in other layouts. */
    mapLibreProps?: Partial<MapProps>
    /** Optional map ref passthrough. */
    mapRef?: React.Ref<MapRef>
    /** Optional basemap override. */
    basemap?: BasemapSpec
    /** Optional cluster controls. */
    clusterRadiusSpacing: number
    /** Whether to zoom to fit on first load. */
    doZoom: boolean
}

interface MarkerState {
    featureId: string
    lon: number
    lat: number
    /** Per-category slice angles in radians, summing to 2π. */
    sliceAngles: number[]
    label: string
    /** Computed display radius in pixels. */
    radius: number
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
        markerOpacity = 1,
    } = props

    const [mapRef, setMapRef] = useState<MapRef | null>(null)
    const [visibleMarkers, setVisibleMarkers] = useState<MarkerState[]>([])

    const updateMarkers = (): void => {
        if (mapRef === null) {
            return
        }

        const newUnclustered: { idxIntoCentroids: number, category: number }[] = []
        const seen = new Set<string>()
        const rawList: {
            featureId: string
            lon: number
            lat: number
            sliceAngles: number[]
            label: string
            totalPieChartSize: number
        }[] = []

        for (const feature of mapRef.querySourceFeatures('centroids')) {
            const coords = (feature.geometry as GeoJSON.Point).coordinates
            const featureProps = feature.properties as ClusterFeatureProperties
            const featureId = featureProps.cluster ? featureProps.cluster_id : featureProps.idxIntoCentroids.toString()

            if (seen.has(featureId)) {
                continue
            }
            seen.add(featureId)

            const totalPieChartSize = categoryColors.reduce((sum, _, idx) => sum + featureProps[`pieChartSizeForCategory${idx}`], 0)
            const sliceAngles = categoryColors.map((_, idx) => featureProps[`pieChartSizeForCategory${idx}`] / totalPieChartSize * 2 * Math.PI)
            const label = featureProps.cluster ? clusterMarkerLabel(featureProps) : unclusteredMarkerLabel(featureProps)

            if (!featureProps.cluster) {
                const category = categoryColors.findIndex((_, idx) => featureProps[`pieChartSizeForCategory${idx}`] > 0)
                assert(category !== -1, 'No category found')
                newUnclustered.push({
                    idxIntoCentroids: featureProps.idxIntoCentroids,
                    category,
                })
            }
            rawList.push({ featureId, lon: coords[0], lat: coords[1], sliceAngles, label, totalPieChartSize })
        }

        const maxPieChartSize = Math.max(...rawList.map(r => r.totalPieChartSize), 0)
        setVisibleMarkers(rawList.map(raw => ({
            featureId: raw.featureId,
            lon: raw.lon,
            lat: raw.lat,
            sliceAngles: raw.sliceAngles,
            label: raw.label,
            radius: maxClusterRadius * Math.sqrt(props.computeRelativeArea(raw.totalPieChartSize, maxPieChartSize)),
        })))

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
                clusterMaxZoom={14}
                clusterRadius={maxClusterRadius * (1 + props.clusterRadiusSpacing / 100)}
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
            <FirstZoom centroids={centroids} doZoom={props.doZoom} />
            {children}
            {visibleMarkers.map(state => (
                <ClusterMarker
                    key={state.featureId}
                    state={state}
                    categoryColors={categoryColors}
                    markerOpacity={markerOpacity}
                />
            ))}
        </CommonMaplibreMap>
    )
}

function FirstZoom(props: { centroids: ICoordinate[], doZoom: boolean }): ReactNode {
    const map = useMap().current!

    useEffect(() => {
        if (!props.doZoom) {
            return
        }
        if (props.centroids.length === 0) {
            return
        }
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
    }, [props.centroids, map, props.doZoom])

    return null
}

function numArraysEqual(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i])
}

interface ClusterMarkerProps {
    state: MarkerState
    categoryColors: string[]
    markerOpacity: number
}

// eslint-disable-next-line no-restricted-syntax -- Memoed
const ClusterMarker = memo(function ClusterMarker({ state, categoryColors, markerOpacity }: ClusterMarkerProps): ReactNode {
    const map = useMap().current!.getMap()

    const [container] = useState<HTMLDivElement>(() => {
        const el = document.createElement('div')
        el.className = 'syau-marker'
        return el
    })
    const markerRef = useRef<maplibregl.Marker | null>(null)

    // Mount/unmount the maplibre Marker
    useEffect(() => {
        const marker = new maplibregl.Marker({ element: container })
            .setLngLat([state.lon, state.lat])
            .addTo(map)
        markerRef.current = marker
        return () => {
            marker.remove()
            markerRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only runs on mount; state.lon/lat updates are handled by the effect below
    }, [map, container])

    // Update position when coords change
    useEffect(() => {
        markerRef.current?.setLngLat([state.lon, state.lat])
    }, [state.lon, state.lat])

    // Update container size and opacity
    useEffect(() => {
        container.style.width = `${2 * state.radius}px`
        container.style.height = `${2 * state.radius}px`
        container.style.opacity = `${markerOpacity}`
    }, [container, state.radius, markerOpacity])

    return createPortal(
        <PieChart categoryColors={categoryColors} sliceAngles={state.sliceAngles} radius={state.radius} label={state.label} />,
        container,
    )
}, (prev, next) =>
    prev.state.lon === next.state.lon
    && prev.state.lat === next.state.lat
    && prev.state.radius === next.state.radius
    && prev.state.label === next.state.label
    && numArraysEqual(prev.state.sliceAngles, next.state.sliceAngles)
    && prev.categoryColors === next.categoryColors
    && prev.markerOpacity === next.markerOpacity,
)

// eslint-disable-next-line no-restricted-syntax -- Memoed
const PieChart = memo(function PieChart({ categoryColors, sliceAngles, radius, label }: { categoryColors: string[], sliceAngles: number[], radius: number, label: string }): ReactNode {
    let startAngle = -Math.PI / 2 // offset so 0% starts at top (12 o'clock)
    const paths: ReactNode[] = []
    for (let i = 0; i < categoryColors.length; i++) {
        const target = startAngle + sliceAngles[i]
        let segStart = startAngle
        for (let seg = 0; seg < 4; seg++) {
            const segEnd = Math.min(target, segStart + Math.PI / 2)
            paths.push(<PieSlice key={`${i}-${seg}`} radius={radius} startAngle={segStart} endAngle={segEnd} color={categoryColors[i]} />)
            if (segEnd === target) break
            segStart = segEnd
        }
        startAngle = target
    }
    return (
        <div style={{ position: 'relative' }}>
            <svg width={radius * 2} height={radius * 2} viewBox={`0 0 ${radius * 2} ${radius * 2}`}>
                {paths}
            </svg>
            <div
                className="serif"
                style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', textAlign: 'center', fontWeight: 500 }}
            >
                {label}
            </div>
        </div>
    )
}, (prev, next) =>
    prev.radius === next.radius
    && prev.label === next.label
    && prev.categoryColors === next.categoryColors
    && numArraysEqual(prev.sliceAngles, next.sliceAngles),
)

// eslint-disable-next-line no-restricted-syntax -- Memoed
const PieSlice = memo(function PieSlice({ radius, startAngle, endAngle, color }: { radius: number, startAngle: number, endAngle: number, color: string }): ReactNode {
    const pad = (endAngle - startAngle) * 0.01
    const startx = radius + radius * Math.cos(startAngle - pad)
    const starty = radius + radius * Math.sin(startAngle - pad)
    const endx = radius + radius * Math.cos(endAngle + pad)
    const endy = radius + radius * Math.sin(endAngle + pad)
    return <path d={`M${radius},${radius} L${startx},${starty} A${radius},${radius} 1 0,1 ${endx},${endy} z`} fill={color} />
})

function optimizeWrapping(lons: number[]): number[] {
    const lonsAboutIDL = lons.map(lon => lon > 0 ? lon - 360 : lon)
    const range = (xs: number[]): number => Math.max(...xs) - Math.min(...xs)
    if (range(lons) < range(lonsAboutIDL)) {
        return lons
    }
    return lonsAboutIDL
}
