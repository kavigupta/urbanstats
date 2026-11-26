/*
 * Paints openfreemap's vector tiles into SVG by hand, since maplibre needs a GL context and a DOM.
 * Fill and line layers follow the site's own style; labels, icons, blur and the transit source are left out.
 */
import { VectorTile, VectorTileFeature } from '@mapbox/vector-tile'
import { FeatureFilter, StyleSpecification, StylePropertyExpression, featureFilter, latest, normalizePropertyExpression } from '@maplibre/maplibre-gl-style-spec'
import Pbf from 'pbf'

import mapStyleJson from '../../src/data/map_style.json'
import { LineStyle } from '../../src/mapper/settings/utils'

import { MapLayout, polyline } from './map-layout'

/** openfreemap has no tiles past this zoom. */
const dataMaxZoom = 14

// MapLibre draws the world this many pixels wide at zoom 0
const worldPxAtZoom0 = 512

const styleLayers = (mapStyleJson as unknown as StyleSpecification).layers

const background = (styleLayers.find(layer => layer.type === 'background')!).paint!['background-color'] as string

const paintedProperties = {
    fill: ['fill-color', 'fill-opacity'],
    line: ['line-color', 'line-opacity', 'line-width', 'line-dasharray', 'line-cap', 'line-join'],
}

interface PaintedLayer {
    sourceLayer: string
    type: 'fill' | 'line'
    minzoom: number
    maxzoom: number
    filter: FeatureFilter
    properties: Record<string, StylePropertyExpression | undefined>
}

let paintedLayers: PaintedLayer[] | undefined

/** Compiled on first use, since startup CPU is billed on every cold start. */
function compiledLayers(): PaintedLayer[] {
    return paintedLayers ??= styleLayers.flatMap((layer): PaintedLayer[] => {
        if ((layer.type !== 'fill' && layer.type !== 'line') || layer.source !== 'openmaptiles' || layer['source-layer'] === undefined || layer.layout?.visibility === 'none') {
            return []
        }
        const spec = latest as Record<string, Record<string, Parameters<typeof normalizePropertyExpression>[1]>>
        const specs = { ...spec[`paint_${layer.type}`], ...spec[`layout_${layer.type}`] }
        const values: Record<string, unknown> = { ...layer.layout, ...layer.paint }
        return [{
            sourceLayer: layer['source-layer'],
            type: layer.type,
            minzoom: layer.minzoom ?? 0,
            maxzoom: layer.maxzoom ?? Infinity,
            filter: featureFilter(layer.filter),
            properties: Object.fromEntries(paintedProperties[layer.type].map((name) => {
                const value = values[name] ?? specs[name].default
                return [name, value === undefined ? undefined : normalizePropertyExpression(value as never, specs[name])]
            })),
        }]
    })
}

function svgColor(value: unknown): { color: string, opacity: number } {
    const { r, g, b, a } = value as { r: number, g: number, b: number, a: number }
    // style-spec's Color is premultiplied
    const channel = (c: number): number => Math.round(a === 0 ? 0 : c / a * 255)
    return { color: `rgb(${channel(r)},${channel(g)},${channel(b)})`, opacity: a }
}

/** The SVG attributes a feature is painted with, or undefined if it isn't drawn. Features with equal attributes share a path. */
function paintFor(layer: PaintedLayer, zoom: number, feature: VectorTileFeature): string | undefined {
    const globals = { zoom }
    const get = (name: string): unknown => layer.properties[name]?.evaluate(globals, feature)
    if (layer.type === 'fill') {
        const { color, opacity } = svgColor(get('fill-color'))
        const total = opacity * (get('fill-opacity') as number)
        return total <= 0 ? undefined : `fill="${color}" fill-opacity="${total.toFixed(3)}"`
    }
    const { color, opacity } = svgColor(get('line-color'))
    const total = opacity * (get('line-opacity') as number)
    const width = get('line-width') as number
    if (total <= 0 || width <= 0) {
        return undefined
    }
    // maplibre's dashes are in line widths
    const dashes = get('line-dasharray') as number[] | undefined
    const dash = dashes === undefined || dashes.length === 0 ? '' : ` stroke-dasharray="${dashes.map(d => (d * width).toFixed(2)).join(' ')}"`
    return `fill="none" stroke="${color}" stroke-opacity="${total.toFixed(3)}" stroke-width="${width.toFixed(2)}" stroke-linecap="${get('line-cap') as string}" stroke-linejoin="${get('line-join') as string}"${dash}`
}

/** The site draws a map's subnational outlines above its shapes, so the two halves are separate. */
export interface PaintedBasemap {
    under: string
    over: string
}

interface Tile {
    tile: VectorTile
    /** Where this tile's top-left corner falls in the card's map box. */
    left: number
    top: number
    px: number
}

/** Keyed by origin because a dev render may point at a snapshot of the tiles. */
const tileTemplates = new Map<string, Promise<string>>()

/** Read from the TileJSON because openfreemap versions its tile path by planet build. */
async function templateUrl(tileOrigin: string): Promise<string> {
    let template = tileTemplates.get(tileOrigin)
    if (template === undefined) {
        template = fetch(`${tileOrigin}/planet`)
            .then(async response => ((await response.json()) as { tiles: string[] }).tiles[0])
        tileTemplates.set(tileOrigin, template)
    }
    try {
        return await template
    }
    catch (error) {
        // Otherwise one failed lookup poisons the isolate for as long as it lives.
        tileTemplates.delete(tileOrigin)
        throw error
    }
}

async function fetchTile(template: string, zoom: number, x: number, y: number): Promise<VectorTile | undefined> {
    const url = template.replaceAll('{z}', String(zoom)).replaceAll('{x}', String(x)).replaceAll('{y}', String(y))
    const response = await fetch(url).catch(() => undefined)
    if (!response?.ok) {
        return undefined
    }
    return new VectorTile(new Pbf(await response.arrayBuffer()))
}

function tilesAt(zoom: number, layout: MapLayout, width: number, height: number): { x: number, y: number }[] {
    const px = layout.scale / 2 ** zoom
    const range = (origin: number, extent: number): number[] => {
        const first = Math.floor(origin / px)
        const last = Math.floor((origin + extent) / px)
        return Array.from({ length: last - first + 1 }, (_, i) => first + i)
    }
    return range(layout.originX, width).flatMap(x => range(layout.originY, height).map(y => ({ x, y })))
}

async function coveringTiles(layout: MapLayout, width: number, height: number, tileOrigin: string, budget: number): Promise<Tile[]> {
    // A card with several insets could otherwise exceed the Worker's subrequest limit.
    let zoom = Math.min(layout.zoom, dataMaxZoom)
    while (zoom > 0 && tilesAt(zoom, layout, width, height).length > budget) {
        zoom--
    }
    const px = layout.scale / 2 ** zoom
    const across = 2 ** zoom

    const template = await templateUrl(tileOrigin)
    const wanted = tilesAt(zoom, layout, width, height)
    const loaded = await Promise.all(wanted.map(async ({ x, y }): Promise<Tile | undefined> => {
        if (y < 0 || y >= across) {
            return undefined
        }
        // x wraps past the antimeridian.
        const tile = await fetchTile(template, zoom, ((x % across) + across) % across, y)
        return tile === undefined
            ? undefined
            : { tile, left: x * px - layout.originX, top: y * px - layout.originY, px }
    }))
    return loaded.filter(tile => tile !== undefined)
}

interface DecodedFeature {
    feature: VectorTileFeature
    /** Empty if the feature misses the card's map box. */
    path: string
}

/** Decoded once per source layer, since several rules read the same one. */
function decodedFeatures(tiles: Tile[], sourceLayer: string, width: number, height: number, cache: Map<string, DecodedFeature[]>): DecodedFeature[] {
    let result = cache.get(sourceLayer)
    if (result !== undefined) {
        return result
    }
    result = []
    for (const { tile, left, top, px } of tiles) {
        if (!Object.hasOwn(tile.layers, sourceLayer)) {
            continue
        }
        const layer = tile.layers[sourceLayer]
        const unit = px / layer.extent
        for (let i = 0; i < layer.length; i++) {
            const feature = layer.feature(i)
            if (feature.type === 1) {
                continue
            }
            // Tiles repeat geometry past their edges; polyline drops whatever is outside the card.
            const path = feature.loadGeometry()
                .map(ring => polyline(ring.map((point): [number, number] => [left + point.x * unit, top + point.y * unit]), width, height, feature.type === 3))
                .join('')
            if (path !== '') {
                result.push({ feature, path })
            }
        }
    }
    cache.set(sourceLayer, result)
    return result
}

/** One path per distinct paint, since a dense tile holds thousands of roads for resvg to parse. */
function groupedPaths(features: DecodedFeature[], paintOf: (feature: VectorTileFeature) => string | undefined): string {
    const groups = new Map<string, string[]>()
    for (const { feature, path } of features) {
        const paint = paintOf(feature)
        if (paint === undefined) {
            continue
        }
        let group = groups.get(paint)
        if (group === undefined) {
            group = []
            groups.set(paint, group)
        }
        group.push(path)
    }
    return Array.from(groups, ([paint, paths]) => `<path d="${paths.join('')}" ${paint}/>`).join('')
}

/** The map's own subnational outlines, filtered the way the site's overlay layer filters them. */
function isSubnational(feature: VectorTileFeature): boolean {
    const p = feature.properties
    return Number(p.admin_level) <= 4 && p.maritime !== 1 && p.disputed !== 1 && !Object.hasOwn(p, 'claimed_by')
}

/** SVG markup sized to the map box. Both halves empty if no tile could be loaded. */
export async function basemap(layout: MapLayout, width: number, height: number, tileOrigin: string, budget = 16, outlines?: LineStyle): Promise<PaintedBasemap> {
    const tiles = await coveringTiles(layout, width, height, tileOrigin, budget)
    if (tiles.length === 0) {
        return { under: '', over: '' }
    }
    const zoom = Math.log2(layout.scale / worldPxAtZoom0)
    const cache = new Map<string, DecodedFeature[]>()
    const painted = compiledLayers()
        .filter(layer => zoom >= layer.minzoom && zoom < layer.maxzoom)
        .map(layer => groupedPaths(
            decodedFeatures(tiles, layer.sourceLayer, width, height, cache).filter(({ feature }) => layer.filter.filter({ zoom }, feature as never)),
            feature => paintFor(layer, zoom, feature),
        ))
        .join('')
    const outlinePaint = outlines === undefined ? '' : `fill="none" stroke="${outlines.color}" stroke-width="${outlines.weight.toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"`
    return {
        under: `<rect width="${width}" height="${height}" fill="${background}"/>${painted}`,
        over: outlines === undefined ? '' : groupedPaths(decodedFeatures(tiles, 'boundary', width, height, cache), feature => isSubnational(feature) ? outlinePaint : undefined),
    }
}
