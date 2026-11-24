import maplibregl from 'maplibre-gl'
import { useEffect, useMemo, useState } from 'react'
import { MapRef } from 'react-map-gl/maplibre'

import { haloBandDirect, projectedRingsDirect, ProjectedRing, RenderedRegion } from './halo-geometry'
import { Polygon } from './map-common'

const projectedRingsCache = new WeakMap<GeoJSON.Geometry, ProjectedRing[]>()

function projectedRings(geometry: GeoJSON.Geometry): ProjectedRing[] {
    let result = projectedRingsCache.get(geometry)
    if (result === undefined) {
        result = projectedRingsDirect(geometry)
        projectedRingsCache.set(geometry, result)
    }
    return result
}

export const haloOpacity = 0.35

const haloBandCache = new WeakMap<GeoJSON.Geometry, { region: RenderedRegion, widthPx: number, band: GeoJSON.MultiPolygon }>()

function haloBand(geometry: GeoJSON.Geometry, region: RenderedRegion, widthPx: number): GeoJSON.MultiPolygon {
    const cached = haloBandCache.get(geometry)
    if (cached?.region === region && cached.widthPx === widthPx) {
        return cached.band
    }
    const band = haloBandDirect(projectedRings(geometry), region, widthPx)
    haloBandCache.set(geometry, { region, widthPx, band })
    return band
}

/**
 * Keeps the current region while the screen stays inside it at the same zoom. Otherwise returns the screen and a
 * screen's width and height past each side, so panning shows the halo before it is recomputed.
 */
export function nextRenderedRegion(map: maplibregl.Map, current: RenderedRegion | undefined): RenderedRegion {
    const bounds = map.getBounds()
    const { x: x0, y: y0 } = maplibregl.MercatorCoordinate.fromLngLat(bounds.getNorthWest())
    const { x: x1, y: y1 } = maplibregl.MercatorCoordinate.fromLngLat(bounds.getSouthEast())
    const zoom = Math.round(map.getZoom())
    if (current?.zoom === zoom && x0 >= current.x0 && x1 <= current.x1 && y0 >= current.y0 && y1 <= current.y1) {
        return current
    }
    const width = x1 - x0
    const height = y1 - y0
    return { zoom, x0: x0 - width, y0: y0 - height, x1: x1 + width, y1: y1 + height }
}

export function useHaloCollection(map: MapRef | undefined, features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
    const [renderedRegion, setRenderedRegion] = useState<RenderedRegion | undefined>(undefined)
    useEffect(() => {
        if (map === undefined) {
            return
        }
        const update = (): void => {
            setRenderedRegion(current => nextRenderedRegion(map.getMap(), current))
        }
        update()
        map.on('moveend', update)
        return () => {
            map.off('moveend', update)
        }
    }, [map])

    return useMemo(() => ({
        type: 'FeatureCollection',
        features: renderedRegion === undefined
            ? []
            : features.flatMap((feature) => {
                const { haloWidth, haloColor } = feature.properties as Polygon
                if (haloWidth === undefined) {
                    return []
                }
                return [{
                    type: 'Feature' as const,
                    properties: { haloColor },
                    geometry: haloBand(feature.geometry, renderedRegion, haloWidth),
                }]
            }),
    }), [features, renderedRegion])
}
