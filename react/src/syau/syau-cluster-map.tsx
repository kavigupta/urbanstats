import maplibregl from 'maplibre-gl'
import React, { CSSProperties, ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { FullscreenControl, Layer, LngLatLike, Source, useMap } from 'react-map-gl/maplibre'

import { Basemap, CommonMaplibreMap, urbanStatsLayerPrefix } from '../components/map-common'
import { Basemap as BasemapSpec } from '../mapper/settings/utils'
import { Navigator } from '../navigation/Navigator'
import { useUniverse } from '../universe'
import { TestUtils } from '../utils/TestUtils'
import { assert } from '../utils/defensive'
import { ICoordinate } from '../utils/protos'

type PieChartSizeCategoryKey = `pieChartSizeForCategory${number}`
type CountCategoryKey = `countCategory${number}`

/** GeoJSON feature properties for clustered centroids (SYAU + mapper clusterMap). */
export type ClusterFeatureProperties = (
    { [key in PieChartSizeCategoryKey]: number } &
    { [key in CountCategoryKey]: number } &
    // eslint-disable-next-line no-restricted-syntax -- cluster_id comes from maplibre and is out of our control
    ({ cluster: true, cluster_id: string, point_count?: number } | {
        cluster: undefined
        idxIntoCentroids: number
        dataIndex?: number
        name?: string
    })
)

export interface ClusterMapCoreProps {
    /**
     * Mapper: pass a pre-built collection so Point coordinates match `features` exactly (no lon/lat round-trip).
     * When set, `centroids` / `categories` / `pieChartSizeFor` / `globalDataIndex` / `pointNames` are ignored for the source.
     */
    geoJsonFeatureCollection?: GeoJSON.FeatureCollection
    centroids?: ICoordinate[]
    categories?: number[]
    pieChartSizeFor?: number[]
    categoryColors: string[]
    onVisibleUnclusteredChange?: (polys: { idxIntoCentroids: number, category: number }[]) => void
    clusterMarkerLabel: (featureProps: ClusterFeatureProperties & { cluster: true }) => string
    unclusteredMarkerLabel: (featureProps: ClusterFeatureProperties & { cluster: undefined }) => string
    children?: ReactNode
    maxClusterRadius: number
    computeRelativeArea: (area: number, maxArea: number) => number
    /** GeoJSON source id (default `centroids`). */
    sourceId?: string
    /** MapLibre cluster radius in pixels (defaults to `maxClusterRadius * 2.5`). */
    clusterRadius?: number
    clusterMaxZoom?: number
    markerClassName?: string
    /**
     * When set, each point gets `properties.dataIndex` for labels (mapper: index into USS `value.data` / `value.geo`).
     * If omitted, SYAU uses `idxIntoCentroids` only.
     */
    globalDataIndex?: number[]
    /** When set with `clickable`, marker clicks navigate to this longname per point. */
    pointNames?: string[]
    /** Unclustered points navigate to article (mapper). */
    clickable?: boolean
}

export interface ClusterMapProps extends ClusterMapCoreProps {
    /** SYAU default: OSM no labels; mapper can pass `value.basemap`. */
    basemap?: BasemapSpec
    containerStyle?: CSSProperties
    showFullscreenControl?: boolean
}

interface ClusterMapElement {
    featureId: string
    html: (radius: number) => string
    coords: LngLatLike
    totalPieChartSize: number
}

/**
 * Clustered GeoJSON centroids + HTML pie markers + invisible layer (keeps clustering queryable).
 * Renders **inside** an existing `react-map-gl` `Map` (e.g. mapper inset); use {@link ClusterMap} for a standalone map.
 */
export function ClusterMapCore(props: ClusterMapCoreProps): ReactNode {
    const {
        geoJsonFeatureCollection,
        categories,
        pieChartSizeFor,
        centroids,
        categoryColors,
        onVisibleUnclusteredChange,
        clusterMarkerLabel,
        unclusteredMarkerLabel,
        children,
        maxClusterRadius,
        computeRelativeArea,
        sourceId = 'centroids',
        clusterRadius: clusterRadiusProp,
        clusterMaxZoom = 14,
        markerClassName = 'syau-marker',
        globalDataIndex,
        pointNames,
        clickable,
    } = props

    const { current: map } = useMap()
    const markersRef = useRef(new Map<string, maplibregl.Marker>())
    const navigator = useContext(Navigator.Context)
    const universe = useUniverse()
    const navigatorRef = useRef(navigator)
    const universeRef = useRef(universe)
    navigatorRef.current = navigator
    universeRef.current = universe

    const clusterRadiusPx = clusterRadiusProp ?? maxClusterRadius * 2.5

    const clusterProperties: Record<string, unknown> = {}
    for (let i = 0; i < categoryColors.length; i++) {
        clusterProperties[`countCategory${i}`] = ['+', ['get', `countCategory${i}`]]
        clusterProperties[`pieChartSizeForCategory${i}`] = ['+', ['get', `pieChartSizeForCategory${i}`]]
    }

    const centroidsData = useMemo(() => {
        if (geoJsonFeatureCollection !== undefined) {
            return geoJsonFeatureCollection
        }
        assert(centroids !== undefined && categories !== undefined && pieChartSizeFor !== undefined, 'ClusterMapCore: centroids+categories+pieChartSizeFor or geoJsonFeatureCollection')
        return {
            type: 'FeatureCollection',
            features: centroids.map((c, idx) => {
                const properties: Record<string, unknown> = {
                    idxIntoCentroids: idx,
                }
                if (globalDataIndex !== undefined) {
                    properties.dataIndex = globalDataIndex[idx]!
                }
                const pn = pointNames?.[idx]
                if (pn !== undefined) {
                    properties.name = pn
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
    }, [geoJsonFeatureCollection, centroids, categories, pieChartSizeFor, categoryColors.length, globalDataIndex, pointNames])

    const centroidsForFirstZoom = useMemo((): ICoordinate[] => {
        if (geoJsonFeatureCollection !== undefined) {
            return geoJsonFeatureCollection.features.map((f) => {
                const g = f.geometry as GeoJSON.Point
                const [lon, lat] = g.coordinates
                return { lon, lat }
            })
        }
        assert(centroids !== undefined, 'ClusterMapCore: centroids for FirstZoom')
        return centroids
    }, [geoJsonFeatureCollection, centroids])

    const updateMarkers = useCallback((): void => {
        if (map === undefined) {
            return
        }

        const newUnclustered: { idxIntoCentroids: number, category: number }[] = []

        let features: maplibregl.MapGeoJSONFeature[]
        try {
            features = map.querySourceFeatures(sourceId) as maplibregl.MapGeoJSONFeature[]
        }
        catch {
            return
        }

        const elements: ClusterMapElement[] = []

        const seen = new Set<string>()

        for (const feature of features) {
            const coords: LngLatLike = (feature.geometry as GeoJSON.Point).coordinates as LngLatLike
            const featureProps = feature.properties as ClusterFeatureProperties
            const featureId = featureProps.cluster ? String(featureProps.cluster_id) : featureProps.idxIntoCentroids.toString()

            if (seen.has(featureId)) {
                continue
            }
            seen.add(featureId)

            const text = featureProps.cluster ? clusterMarkerLabel(featureProps as ClusterFeatureProperties & { cluster: true }) : unclusteredMarkerLabel(featureProps as ClusterFeatureProperties & { cluster: undefined })
            if (!featureProps.cluster) {
                const category = categoryColors.findIndex((_, idx) => featureProps[`pieChartSizeForCategory${idx}`] > 0)
                assert(category !== -1, 'No category found')
                newUnclustered.push({
                    idxIntoCentroids: featureProps.idxIntoCentroids,
                    category,
                })
            }
            const totalPieChartSize = categoryColors.reduce((sum, _, idx) => sum + featureProps[`pieChartSizeForCategory${idx}`], 0) || 1

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
        const prev = markersRef.current
        for (const element of elements) {
            const existingMarker = prev.get(element.featureId)
            const radius = maxClusterRadius * Math.sqrt(computeRelativeArea(element.totalPieChartSize, maxPieChartSize))
            const html = element.html(radius)
            if (existingMarker !== undefined) {
                const el = existingMarker.getElement()
                el.innerHTML = html
                el.className = markerClassName
                el.style.width = `${2 * radius}px`
                el.style.height = `${2 * radius}px`
                existingMarker.setLngLat(element.coords)
                newMarkers.set(element.featureId, existingMarker)
            }
            else {
                const el = document.createElement('div')
                el.innerHTML = html
                el.className = markerClassName
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
        for (const [id, marker] of newMarkers.entries()) {
            if (!prev.has(id)) {
                marker.addTo(map.getMap())
            }
        }
        markersRef.current = newMarkers

        const featureByFeatureId = new Map<string, maplibregl.MapGeoJSONFeature>()
        for (const feature of features) {
            const p = feature.properties as ClusterFeatureProperties
            const fid = p.cluster ? String(p.cluster_id) : p.idxIntoCentroids.toString()
            if (!featureByFeatureId.has(fid)) {
                featureByFeatureId.set(fid, feature)
            }
        }
        for (const element of elements) {
            const marker = newMarkers.get(element.featureId)
            if (marker === undefined) {
                continue
            }
            const el = marker.getElement()
            const feature = featureByFeatureId.get(element.featureId)
            const fp = feature?.properties as ClusterFeatureProperties | undefined
            if (clickable === true && fp !== undefined && fp.cluster !== true && typeof fp.name === 'string') {
                el.style.cursor = 'pointer'
                const longname = fp.name
                el.onclick = (e) => {
                    e.stopPropagation()
                    void navigatorRef.current.navigate({
                        kind: 'article',
                        universe: universeRef.current,
                        longname,
                    }, { history: 'push', scroll: { kind: 'element', element: map.getMap().getContainer() } })
                }
            }
            else {
                el.style.cursor = ''
                el.onclick = null
            }
        }

        newUnclustered.sort((a, b) => {
            if (a.idxIntoCentroids < b.idxIntoCentroids) return -1
            if (a.idxIntoCentroids > b.idxIntoCentroids) return 1
            return 0
        })
        onVisibleUnclusteredChange?.(newUnclustered)
    }, [
        map,
        sourceId,
        categoryColors,
        onVisibleUnclusteredChange,
        clusterMarkerLabel,
        unclusteredMarkerLabel,
        maxClusterRadius,
        computeRelativeArea,
        markerClassName,
        clickable,
    ])

    useEffect(() => {
        if (map === undefined) {
            return
        }
        const raw = map.getMap()
        updateMarkers()
        raw.on('move', updateMarkers)
        raw.on('data', updateMarkers)
        raw.on('idle', updateMarkers)
        raw.on('styledata', updateMarkers)
        raw.on('sourcedata', updateMarkers)
        return () => {
            raw.off('move', updateMarkers)
            raw.off('data', updateMarkers)
            raw.off('idle', updateMarkers)
            raw.off('styledata', updateMarkers)
            raw.off('sourcedata', updateMarkers)
            for (const m of markersRef.current.values()) {
                m.remove()
            }
            markersRef.current = new Map()
        }
    }, [map, updateMarkers, centroidsData])

    const layerId = `${urbanStatsLayerPrefix}-centroid-placeholders-${sourceId}`

    return (
        <>
            <Source
                id={sourceId}
                type="geojson"
                data={centroidsData}
                cluster={true}
                clusterMaxZoom={clusterMaxZoom}
                clusterRadius={clusterRadiusPx}
                clusterProperties={clusterProperties}
            />
            <Layer
                id={layerId}
                type="circle"
                source={sourceId}
                filter={['!=', 'cluster', true]}
                paint={{ 'circle-radius': 0 }}
            />
            <FirstZoom centroids={centroidsForFirstZoom} />
            {children}
        </>
    )
}

/**
 * Standalone clustered centroid map (SYAU): wraps {@link ClusterMapCore} in {@link CommonMaplibreMap} + basemap.
 */
export function ClusterMap(props: ClusterMapProps): ReactNode {
    const basemap: BasemapSpec = useMemo(() => TestUtils.shared.isTesting
        // eslint-disable-next-line no-restricted-syntax -- just for testing
        ? { type: 'none', backgroundColor: 'white', textColor: 'black' } satisfies BasemapSpec
        : { type: 'osm', noLabels: true } satisfies BasemapSpec,
    [])

    const {
        basemap: basemapProp,
        containerStyle,
        showFullscreenControl = true,
        children,
        ...coreProps
    } = props

    return (
        <CommonMaplibreMap
            style={{ height: 600, ...containerStyle }}
        >
            <Basemap basemap={basemapProp ?? basemap} />
            {showFullscreenControl ? <FullscreenControl position="top-left" /> : null}
            <ClusterMapCore {...coreProps}>
                {children}
            </ClusterMapCore>
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
