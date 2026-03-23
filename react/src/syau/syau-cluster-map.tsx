import maplibregl from 'maplibre-gl'
import React, { CSSProperties, ReactNode, useEffect, useMemo, useState } from 'react'
import { FullscreenControl, Layer, LngLatLike, MapRef, Source, useMap } from 'react-map-gl/maplibre'

import { Basemap, CommonMaplibreMap, urbanStatsLayerPrefix } from '../components/map-common'
import { Basemap as BasemapSpec } from '../mapper/settings/utils'
import { TestUtils } from '../utils/TestUtils'
import { assert } from '../utils/defensive'
import { ICoordinate } from '../utils/protos'

const circleMarkerRadius = 20

type PopulationCategoryKey = `populationCategory${number}`
type CountCategoryKey = `countCategory${number}`

/**
 * Props for the clustered centroid map (SYAU game map). Kept explicit so other
 * call sites can reuse the same map shell later.
 */
export interface SyauClusterMapProps {
    /** Point GeoJSON for the `centroids` source (SYAU feature properties on each point). */
    centroidsData: GeoJSON.FeatureCollection
    /** Same locations as `centroidsData`, used only for initial fitBounds. */
    mapBoundsCentroids: ICoordinate[]
    categoryColors: string[]
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

type ClusterFeatureProperties = (
    { [key in PopulationCategoryKey]: number } &
    { [key in CountCategoryKey]: number } &
    // eslint-disable-next-line no-restricted-syntax -- cluster_id comes from maplibre and is out of our control
    ({ cluster: true, cluster_id: string } | { cluster: undefined, name: string, populationOrdinal: number })
)

/**
 * Clustered GeoJSON centroids + HTML pie markers + invisible hit-test layer + first zoom.
 * Extracted from SYAU as a reusable map module.
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

    const [mapRef, setMapRef] = useState<MapRef | null>(null)
    const [markersOnScreen, setMarkersOnScreen] = useState(new Map<string, maplibregl.Marker>())

    function clusterDisplayText(featureProps: ClusterFeatureProperties & { cluster: true }): string {
        const countGuessed = featureProps.countCategory1
        const countTotal = featureProps.countCategory0 + featureProps.countCategory1
        return `${countGuessed}/${countTotal}`
    }

    function unclusteredDisplayText(featureProps: ClusterFeatureProperties & { cluster: undefined }): string {
        return `#${featureProps.populationOrdinal}`
    }

    const updateMarkers = (): void => {
        if (mapRef === null) {
            return
        }

        const newMarkers = new Map<string, maplibregl.Marker>()
        const newPolys: { name: string, category: number }[] = []

        const features = mapRef.querySourceFeatures('centroids')

        for (const feature of features) {
            const coords: LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as LngLatLike
            const featureProps = feature.properties as ClusterFeatureProperties
            const featureId = featureProps.cluster ? featureProps.cluster_id : featureProps.name

            let text: string
            if (featureProps.cluster) {
                text = clusterDisplayText(featureProps)
            }
            else {
                const category = categoryColors.findIndex((_, idx) => featureProps[`populationCategory${idx}`] > 0)
                assert(category !== -1, 'No category found')
                newPolys.push({
                    name: featureProps.name,
                    category,
                })
                text = unclusteredDisplayText(featureProps)
            }
            const totalPopulation = categoryColors.reduce((sum, _, idx) => sum + featureProps[`populationCategory${idx}`], 0)
            const html = circleSector(
                categoryColors,
                categoryColors.map((_, idx) => featureProps[`populationCategory${idx}`] / totalPopulation * 2 * Math.PI),
                circleMarkerRadius,
                text,
            )

            let existingMarker
            if ((existingMarker = markersOnScreen.get(featureId)) !== undefined) {
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
                markersOnScreen.set(featureId, marker)
            }
        }
        for (const [oldMarkerId, oldMarker] of markersOnScreen.entries()) {
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

    const clusterProperties: Record<string, unknown> = {}
    for (let i = 0; i < categoryColors.length; i++) {
        clusterProperties[`countCategory${i}`] = ['+', ['get', `countCategory${i}`]]
        clusterProperties[`populationCategory${i}`] = ['+', ['get', `populationCategory${i}`]]
    }

    const basemap: BasemapSpec = useMemo(() => TestUtils.shared.isTesting
        // eslint-disable-next-line no-restricted-syntax -- just for testing
        ? { type: 'none', backgroundColor: 'white', textColor: 'black' } satisfies BasemapSpec
        : { type: 'osm', noLabels: true } satisfies BasemapSpec,
    [])

    return (
        <CommonMaplibreMap
            ref={setMapRef}
            onMove={updateMarkers}
            onData={updateMarkers}
            style={{ height: 600, ...mapStyle }}
        >
            <Basemap basemap={basemap} />
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
