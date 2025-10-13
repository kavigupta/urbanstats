import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import React, { ReactNode, useContext, useEffect, useId, useMemo } from 'react'
import { Layer, Map, MapProps, MapRef, Source, useControl, useMap } from 'react-map-gl/maplibre'

import { boundingBox, extendBoxes, geometry } from '../map-partition'
import { Navigator } from '../navigation/Navigator'
import { useColors } from '../page_template/colors'
import { TestUtils } from '../utils/TestUtils'
import { assert } from '../utils/defensive'
import { promiseStream, waiting } from '../utils/promiseStream'
import { Feature } from '../utils/protos'
import { loadFeatureFromPossibleSymlink } from '../utils/symlinks'
import { NormalizeProto } from '../utils/types'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { mapBorderRadius, mapBorderWidth, useScreenshotMode } from './screenshot'

// eslint-disable-next-line import/no-unassigned-import -- Side effect only
import '../utils/map-rtl'
import './map.css'

export const defaultMapPadding = 20
export const insetBorderWidth = 2

// eslint-disable-next-line no-restricted-syntax -- Forwarded ref
function _CommonMaplibreMap(props: MapProps, ref: React.Ref<MapRef>): ReactNode {
    const colors = useColors()
    const isScreenshotMode = useScreenshotMode()

    return (
        <Map
            ref={ref}
            mapStyle="https://tiles.openfreemap.org/styles/bright"
            canvasContextAttributes={{
                preserveDrawingBuffer: true, // Allows screenshots
            }}
            {...props}
            style={{
                width: '100%',
                height: 400,
                borderRadius: mapBorderRadius,
                border: `${mapBorderWidth}px solid ${colors.borderNonShadow}`,
                // Background color is used for e2e tests
                backgroundColor: isScreenshotMode ? 'transparent' : colors.slightlyDifferentBackground,
                ...props.style,
            }}
        />
    )
}

// eslint-disable-next-line no-restricted-syntax -- Is a function component
export const CommonMaplibreMap = React.forwardRef(_CommonMaplibreMap)

export function useZoomFirstFeature(mapRef: React.RefObject<MapRef>, features: (GeoJSON.Feature | typeof waiting)[]): void {
    const firstFeature = features.length > 0 ? features[0] : undefined

    useEffect(() => {
        if (firstFeature === undefined || firstFeature === waiting) {
            return
        }
        mapRef.current?.fitBounds(boundingBox(firstFeature.geometry), { animate: false, padding: defaultMapPadding })
    }, [mapRef, firstFeature]) // Don't depend on all features or we keep zooming as they load
}

export function useZoomAllFeatures(mapRef: React.RefObject<MapRef>, features: (GeoJSON.Feature | typeof waiting)[], readyFeatures: GeoJSON.Feature[]): void {
    useEffect(() => {
        if (readyFeatures.length < features.length) {
            return
        }
        // Only zoom once all features are ready
        mapRef.current?.fitBounds(extendBoxes(readyFeatures.map(f => boundingBox(f.geometry))), { animate: false, padding: defaultMapPadding })
    }, [mapRef, features, readyFeatures])
}

export interface Polygon {
    name: string
    clickable?: boolean

    // Style
    fillColor: string
    fillOpacity: number
    color: string
    weight?: number

    meta?: Record<string, unknown>
}

function polygonsId(id: string, kind: 'source' | 'fill' | 'outline'): string {
    return `polygons-${kind}-${id}`
}

export function PolygonFeatureCollection({ features, clickable }: { features: GeoJSON.Feature[], clickable: boolean }): ReactNode {
    const { current: map } = useMap()

    const labelId = useOrderedResolve(useMemo(() => map !== undefined ? firstLabelId(map) : Promise.resolve(undefined), [map])).result

    const collection: GeoJSON.FeatureCollection = useMemo(() => ({
        type: 'FeatureCollection',
        features,
    }), [features])

    const id = useId()

    useClickable({ id: polygonsId(id, 'fill'), features, clickable })

    return (
        <>
            <Source id={polygonsId(id, 'source')} type="geojson" data={collection} />
            <Layer
                id={polygonsId(id, 'fill')}
                type="fill"
                source={polygonsId(id, 'source')}
                paint={{
                    'fill-color': ['get', 'fillColor'],
                    'fill-opacity': ['get', 'fillOpacity'],
                }}
                beforeId={labelId}
            />
            <Layer
                id={polygonsId(id, 'outline')}
                type="line"
                source={polygonsId(id, 'source')}
                paint={{
                    'line-color': ['get', 'color'],
                    'line-width': ['get', 'weight'],
                }}
                beforeId={labelId}
            />
        </>
    )
}

async function polygonGeojson(polygon: Polygon): Promise<GeoJSON.Feature> {
    const feature = await loadFeatureFromPossibleSymlink(polygon.name) as NormalizeProto<Feature>
    return {
        type: 'Feature' as const,
        properties: polygon,
        geometry: geometry(feature),
    }
}

export function polygonFeatureCollection(polygons: Polygon[]): { use: () => (GeoJSON.Feature | typeof waiting)[] } {
    return promiseStream(polygons.map(polygonGeojson))
}

async function firstLabelId(map: MapRef): Promise<string | undefined> {
    if (!map.loaded()) {
        await new Promise(resolve => map.once('load', resolve))
    }
    for (const layerId of map.getLayersOrder()) {
        const layer = map.getLayer(layerId)!
        if (layer.type === 'symbol' && layer.id.startsWith('label')) {
            return layer.id
        }
    }
    return undefined
}

class CustomAttributionControl extends maplibregl.AttributionControl {
    constructor(startShowingAttribution: boolean) {
        super()

        // Copied from implementation https://github.com/maplibre/maplibre-gl-js/blob/34b95c06259014661cf72a418fd81917313088bf/src/ui/control/attribution_control.ts#L190
        // But reduced since always compact
        this._updateCompact = () => {
            if (!this._container.classList.contains('maplibregl-compact') && !this._container.classList.contains('maplibregl-attrib-empty')) {
                this._container.classList.add('maplibregl-compact')
                if (startShowingAttribution) {
                    this._container.setAttribute('open', '')
                    this._container.classList.add('maplibregl-compact-show')
                }
            }
        }
    }
}

export function CustomAttributionControlComponent({ startShowingAttribution }: { startShowingAttribution: boolean }): ReactNode {
    useControl(() => new CustomAttributionControl(startShowingAttribution))
    return null
}

function pointsId(id: string, kind: 'source' | 'fill' | 'outline'): string {
    return `points-${kind}-${id}`
}

export function PointFeatureCollection({ features, clickable }: { features: GeoJSON.Feature[], clickable: boolean }): ReactNode {
    const { current: map } = useMap()
    const id = useId()

    const labelId = useOrderedResolve(useMemo(() => map !== undefined ? firstLabelId(map) : Promise.resolve(undefined), [map])).result

    const collection: GeoJSON.FeatureCollection = useMemo(() => ({
        type: 'FeatureCollection',
        features,
    }), [features])

    useClickable({ id: pointsId(id, 'fill'), features, clickable })

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

function useClickable({ id, clickable, features }: { id: string, clickable: boolean, features: GeoJSON.Feature[] }): void {
    const navigator = useContext(Navigator.Context)

    const { current: map } = useMap()

    useEffect(() => {
        if (clickable) {
            assert(map !== undefined, 'map is undefined')

            const clickFeature = (name: string): void => {
                void navigator.navigate({
                    kind: 'article',
                    universe: navigator.universe,
                    longname: name,
                }, { history: 'push', scroll: { kind: 'element', element: map.getContainer() } })
            }

            const overCallback = (): void => {
                map.getCanvas().style.cursor = 'pointer'
            }
            const leaveCallback = (): void => {
                map.getCanvas().style.cursor = ''
            }
            const clickCallback = (e: maplibregl.MapMouseEvent & {
                features?: maplibregl.MapGeoJSONFeature[]
            }): void => {
                const feature = e.features?.find(f => f.properties.clickable !== false)
                if (feature !== undefined) {
                    clickFeature(feature.properties.name as string)
                }
            }
            map.on('mouseover', id, overCallback)
            map.on('mouseleave', id, leaveCallback)
            map.on('click', id, clickCallback)

            TestUtils.shared.clickableMaps.set(id, { clickFeature, features: features.map(f => f.properties!.name as string) })

            return () => {
                map.off('mouseover', id, overCallback)
                map.off('mouseleave', id, leaveCallback)
                map.off('click', id, clickCallback)

                TestUtils.shared.clickableMaps.delete(id)
            }
        }

        return () => undefined
    }, [id, map, clickable, navigator, features])
}
