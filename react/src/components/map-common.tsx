import maplibregl from 'maplibre-gl'
import React, { ReactNode, useEffect, useMemo } from 'react'
import { Layer, Map, MapProps, MapRef, Source, useControl, useMap } from 'react-map-gl/maplibre'

import { boundingBox, geometry } from '../map-partition'
import { useColors } from '../page_template/colors'
import { promiseStream, waiting } from '../utils/promiseStream'
import { Feature } from '../utils/protos'
import { loadShapeFromPossibleSymlink } from '../utils/symlinks'
import { NormalizeProto } from '../utils/types'
import { useOrderedResolve } from '../utils/useOrderedResolve'

import { defaultMapPadding } from './map'
import { mapBorderRadius, mapBorderWidth, useScreenshotMode } from './screenshot'

// eslint-disable-next-line no-restricted-syntax -- Forwarded ref
function _CommonMaplibreMap(props: MapProps, ref: React.Ref<MapRef>): ReactNode {
    const colors = useColors()
    const isScreenshotMode = useScreenshotMode()

    return (
        <Map
            ref={ref}
            style={{
                width: '100%',
                height: 400,
                borderRadius: mapBorderRadius,
                border: `${mapBorderWidth}px solid ${colors.borderNonShadow}`,
                // Background color is used for e2e tests
                backgroundColor: isScreenshotMode ? 'transparent' : colors.slightlyDifferentBackground,
            }}
            mapStyle="https://tiles.openfreemap.org/styles/bright"
            canvasContextAttributes={{
                preserveDrawingBuffer: true, // Allows screenshots
            }}
            RTLTextPlugin="https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js"
            {...props}
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

export interface Shape {
    name: string
    clickable?: boolean

    // Style
    fillColor: string
    fillOpacity: number
    color: string
    weight?: number
}

export function shapesId(id: string, kind: 'source' | 'fill' | 'outline'): string {
    return `shapes-${kind}-${id}`
}

export function ShapeCollection({ features, id }: { features: GeoJSON.Feature[], id: string }): ReactNode {
    const { current: map } = useMap()

    const labelId = useOrderedResolve(useMemo(() => map !== undefined ? firstLabelId(map) : Promise.resolve(undefined), [map]))

    const collection: GeoJSON.FeatureCollection = useMemo(() => ({
        type: 'FeatureCollection',
        features,
    }), [features])

    return (
        <>
            <Source id={shapesId(id, 'source')} type="geojson" data={collection} />
            <Layer
                id={shapesId(id, 'fill')}
                type="fill"
                source={shapesId(id, 'source')}
                paint={{
                    'fill-color': ['get', 'fillColor'],
                    'fill-opacity': ['get', 'fillOpacity'],
                }}
                beforeId={labelId}
            />
            <Layer
                id={shapesId(id, 'outline')}
                type="line"
                source={shapesId(id, 'source')}
                paint={{
                    'line-color': ['get', 'color'],
                    'line-width': ['get', 'weight'],
                }}
                beforeId={labelId}
            />
        </>
    )
}

async function shapeGeojson(shape: Shape): Promise<GeoJSON.Feature> {
    const feature = await loadShapeFromPossibleSymlink(shape.name) as NormalizeProto<Feature>
    return {
        type: 'Feature' as const,
        properties: shape,
        geometry: geometry(feature),
    }
}

export function shapeFeatureCollection(shapes: Shape[]): { use: () => (GeoJSON.Feature | typeof waiting)[] } {
    return promiseStream(shapes.map(shapeGeojson))
}

async function firstLabelId(map: MapRef): Promise<string | undefined> {
    if (!map.isStyleLoaded() || (map.style as unknown) === undefined) {
        await new Promise(resolve => map.once('style.load', resolve))
    }

    for (const layer of map.style.stylesheet.layers) {
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
