import Color from 'color'
import maplibregl from 'maplibre-gl'
import { useContext, useEffect, useRef } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'

import { Navigator } from '../navigation/Navigator'
import { useUniverse } from '../universe'

export type PieSegment = { color: string, fraction: number }

export type MarkerPieSpec = {
    segments: PieSegment[]
    label: string
    /** Override default marker pixel radius */
    radiusPx?: number
}

function pieWedgePath(radius: number, startAngle: number, endAngle: number): string {
    const cx = radius
    const cy = radius
    const x1 = cx + radius * Math.cos(startAngle)
    const y1 = cy + radius * Math.sin(startAngle)
    const x2 = cx + radius * Math.cos(endAngle)
    const y2 = cy + radius * Math.sin(endAngle)
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
    return `M ${cx},${cy} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`
}

/**
 * SVG pie chart marker: sectors by fraction (sum need not be 1 — normalized), center label.
 * Same rendering path for SYAU (2 colors) and clusterMap (ramp colors per leaf share).
 */
export function pieMarkerHtml(segments: PieSegment[], radius: number, centerText: string, fillOpacity: number): string {
    const positive = segments.filter(s => s.fraction > 0)
    if (positive.length === 0) {
        positive.push({ color: '#888888', fraction: 1 })
    }
    const total = positive.reduce((s, x) => s + x.fraction, 0) || 1
    const norm = positive.map(s => ({
        color: applyFillOpacity(s.color, fillOpacity),
        fraction: s.fraction / total,
    }))

    let angle = -Math.PI / 2
    const paths = norm.map((seg) => {
        const da = seg.fraction * 2 * Math.PI
        const start = angle
        const end = angle + da
        angle = end
        return `<path d="${pieWedgePath(radius, start, end)}" fill="${escapeSvgAttr(seg.color)}"></path>`
    })

    return [
        '<div style="position:relative;width:',
        String(radius * 2),
        'px;height:',
        String(radius * 2),
        'px">',
        `<svg xmlns="http://www.w3.org/2000/svg" width="${radius * 2}" height="${radius * 2}" viewBox="0 0 ${radius * 2} ${radius * 2}">`,
        ...paths,
        '</svg>',
        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:100%;text-align:center;font-weight:500;pointer-events:none" class="serif">',
        escapeHtml(centerText),
        '</div>',
        '</div>',
    ].join('')
}

function applyFillOpacity(cssColor: string, opacity: number): string {
    try {
        return Color(cssColor).alpha(opacity).rgb().string()
    }
    catch {
        return cssColor
    }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

function escapeSvgAttr(s: string): string {
    return s.replace(/"/g, '&quot;')
}

/** Match MapLibre/SYAU: clusters expose `cluster: true` and/or `point_count` + `cluster_id`. */
export function isClusterMapFeature(feature: maplibregl.MapGeoJSONFeature): boolean {
    const p = feature.properties as Record<string, unknown>
    if (p.cluster === true) {
        return true
    }
    return p.point_count !== undefined && p.cluster_id !== undefined
}

export async function getClusterLeavesAsync(
    source: maplibregl.GeoJSONSource,
    clusterId: number,
    limit = 500,
): Promise<GeoJSON.Feature[]> {
    try {
        return await source.getClusterLeaves(clusterId, limit, 0)
    }
    catch {
        return []
    }
}

/** Ramp / multi-color clusters: one sector per distinct fillColor, size ∝ clusterWeight sum. */
export function segmentsFromLeavesByFillColor(leaves: GeoJSON.Feature[]): PieSegment[] {
    const byColor = new Map<string, number>()
    for (const leaf of leaves) {
        const p = leaf.properties as Record<string, unknown> | null
        if (p === null) {
            continue
        }
        const color = typeof p.fillColor === 'string' ? p.fillColor : '#888888'
        const wRaw = p.clusterWeight
        const w = typeof wRaw === 'number' ? wRaw : Number(wRaw)
        const weight = Number.isFinite(w) ? Math.max(0, w) : 0
        byColor.set(color, (byColor.get(color) ?? 0) + weight)
    }
    if (byColor.size === 0) {
        return [{ color: '#888888', fraction: 1 }]
    }
    return [...byColor.entries()].map(([color, fraction]) => ({ color, fraction }))
}

/**
 * HTML markers for clustered GeoJSON sources (SYAU + mapper clusterMap): pie sectors + labels.
 * Replaces separate MapLibre circle layers so both apps share one visual model.
 */
export function useClusterPieMarkers({
    map,
    sourceId,
    defaultRadiusPx,
    fillOpacity,
    markerClassName,
    getKey,
    buildSpec,
    onUnclusteredBatch,
    clickable,
}: {
    map: MapRef | null | undefined
    sourceId: string
    defaultRadiusPx: number
    fillOpacity: number
    markerClassName: string
    getKey: (feature: maplibregl.MapGeoJSONFeature) => string
    buildSpec: (
        feature: maplibregl.MapGeoJSONFeature,
        geoSource: maplibregl.GeoJSONSource,
    ) => Promise<MarkerPieSpec | null>
    /** Runs synchronously each frame from current `querySourceFeatures` (SYAU polygon highlights). */
    onUnclusteredBatch?: (unclustered: maplibregl.MapGeoJSONFeature[]) => void
    clickable?: boolean
}): void {
    const markersRef = useRef(new Map<string, maplibregl.Marker>())
    const navigator = useContext(Navigator.Context)
    const universe = useUniverse()
    const navigatorRef = useRef(navigator)
    const universeRef = useRef(universe)
    navigatorRef.current = navigator
    universeRef.current = universe
    const genRef = useRef(0)

    useEffect(() => {
        if (map === null || map === undefined) {
            return
        }

        const rawMap = map.getMap()

        const run = (): void => {
            const src = rawMap.getSource(sourceId)
            if (src === undefined || src.type !== 'geojson') {
                // react-map-libre <Source> only calls addSource after map.style._loaded; our effect can run first.
                return
            }
            const geoSource = src as maplibregl.GeoJSONSource
            const myGen = ++genRef.current

            void (async () => {
                let features: maplibregl.MapGeoJSONFeature[]
                try {
                    features = rawMap.querySourceFeatures(sourceId) as maplibregl.MapGeoJSONFeature[]
                }
                catch {
                    return
                }

                onUnclusteredBatch?.(features.filter(f => !isClusterMapFeature(f)))

                const built = await Promise.all(
                    features.map(async (f) => {
                        const spec = await buildSpec(f, geoSource)
                        return { f, spec }
                    }),
                )

                if (myGen !== genRef.current) {
                    return
                }

                const newMarkers = new Map<string, maplibregl.Marker>()
                const prev = markersRef.current

                for (const { f, spec } of built) {
                    if (spec === null) {
                        continue
                    }
                    const key = getKey(f)
                    const radius = spec.radiusPx ?? defaultRadiusPx
                    const html = pieMarkerHtml(spec.segments, radius, spec.label, fillOpacity)
                    const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]

                    let marker = prev.get(key)
                    if (marker !== undefined) {
                        marker.getElement().innerHTML = html
                        marker.setLngLat(coords)
                        newMarkers.set(key, marker)
                    }
                    else {
                        const el = document.createElement('div')
                        el.innerHTML = html
                        el.className = markerClassName
                        el.style.width = `${radius * 2}px`
                        el.style.height = `${radius * 2}px`
                        if (clickable === true && !isClusterMapFeature(f)) {
                            const props = f.properties as Record<string, unknown>
                            const name = props.name
                            if (typeof name === 'string') {
                                el.style.cursor = 'pointer'
                                el.addEventListener('click', (e) => {
                                    e.stopPropagation()
                                    void navigatorRef.current.navigate({
                                        kind: 'article',
                                        universe: universeRef.current,
                                        longname: name,
                                    }, { history: 'push', scroll: { kind: 'element', element: rawMap.getContainer() } })
                                })
                            }
                        }
                        marker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(rawMap)
                        newMarkers.set(key, marker)
                    }
                }

                for (const [oldKey, oldMarker] of prev.entries()) {
                    if (!newMarkers.has(oldKey)) {
                        oldMarker.remove()
                    }
                }
                markersRef.current = newMarkers
            })()
        }

        rawMap.on('move', run)
        rawMap.on('data', run)
        rawMap.on('idle', run)
        // GeoJSON <Source> is added only after map.style._loaded; first effect run often predates the source.
        rawMap.on('styledata', run)
        rawMap.on('sourcedata', run)
        rawMap.on('load', run)
        run()

        return () => {
            genRef.current++
            rawMap.off('move', run)
            rawMap.off('data', run)
            rawMap.off('idle', run)
            rawMap.off('styledata', run)
            rawMap.off('sourcedata', run)
            rawMap.off('load', run)
            for (const m of markersRef.current.values()) {
                m.remove()
            }
            markersRef.current = new Map()
        }
    }, [map, sourceId, defaultRadiusPx, fillOpacity, markerClassName, getKey, buildSpec, onUnclusteredBatch, clickable])
}
