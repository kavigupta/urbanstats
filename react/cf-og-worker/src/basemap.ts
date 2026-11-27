/*
 * Paints openfreemap's vector tiles into SVG by hand, since maplibre needs a GL context and a DOM.
 * Its layers are the site's style's, through card_basemap.json.
 */
import { VectorTile, VectorTileFeature } from '@mapbox/vector-tile'
import Pbf from 'pbf'

import { subnationalOutlinesFilter } from '../../src/components/map-common-utils'
import cardBasemap from '../../src/data/card_basemap.json'
import { LineStyle } from '../../src/mapper/settings/utils'

import { MapLayout, polyline } from './map-layout'
import { Expression, matchesFilter } from './style-filter'

/** openfreemap has no tiles past this zoom. */
const dataMaxZoom = 14

type Stops<T> = [zoom: number, value: T][]

interface Layer {
    sourceLayer: string
    /** Absent means all of the source layer's features. */
    filter?: Expression
    fill?: Stops<string>
    stroke?: Stops<string>
    width?: Stops<number>
    opacity?: Stops<number>
    /** Each holds from its zoom to the next's. In line widths. */
    dash?: Stops<number[]>
    minZoom?: number
    maxZoom?: number
}

function numberAt(stops: Stops<number>, zoom: number): number {
    if (zoom <= stops[0][0]) {
        return stops[0][1]
    }
    for (let i = 1; i < stops.length; i++) {
        const [z0, w0] = stops[i - 1]
        const [z1, w1] = stops[i]
        if (zoom <= z1) {
            return w0 + (w1 - w0) * (zoom - z0) / (z1 - z0)
        }
    }
    return stops[stops.length - 1][1]
}

function colorAt(stops: Stops<string>, zoom: number): string {
    if (stops.length === 1) {
        return stops[0][1]
    }
    const channel = (c: number): number => Math.round(numberAt(stops.map(([z, color]) => [z, parseInt(color.slice(1 + 2 * c, 3 + 2 * c), 16)]), zoom))
    return `rgb(${channel(0)},${channel(1)},${channel(2)})`
}

function stepAt<T>(stops: Stops<T>, zoom: number): T {
    let value = stops[0][1]
    for (const [z, v] of stops) {
        if (z <= zoom) {
            value = v
        }
    }
    return value
}

const layers = cardBasemap.layers as unknown as Layer[]

const background = cardBasemap.background

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
    // As maplibre picks a vector source's tiles
    let zoom = Math.min(Math.floor(layout.zoom), dataMaxZoom)
    // A card with several insets could otherwise exceed the Worker's subrequest limit.
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

/** Decoded once per source layer, since several layers read the same one. */
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

function layerPath(layer: Layer, zoom: number, tiles: Tile[], width: number, height: number, cache: Map<string, DecodedFeature[]>): string {
    const strokeWidth = layer.width === undefined ? 1 : numberAt(layer.width, zoom)
    const opacityValue = layer.opacity === undefined ? 1 : numberAt(layer.opacity, zoom)
    if (strokeWidth <= 0 || opacityValue <= 0) {
        return ''
    }
    const paint = layer.fill !== undefined
        ? `fill="${colorAt(layer.fill, zoom)}"`
        : `fill="none" stroke="${colorAt(layer.stroke!, zoom)}" stroke-width="${strokeWidth.toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"${layer.dash === undefined ? '' : ` stroke-dasharray="${stepAt(layer.dash, zoom).map(d => (d * strokeWidth).toFixed(2)).join(' ')}"`}`
    const opacity = layer.opacity === undefined ? '' : ` opacity="${opacityValue.toFixed(3)}"`
    return groupedPaths(
        decodedFeatures(tiles, layer.sourceLayer, width, height, cache),
        feature => matchesFilter(layer.filter, feature) ? `${paint}${opacity}` : undefined,
    )
}

/** SVG markup sized to the map box. Both halves empty if no tile could be loaded. */
export async function basemap(layout: MapLayout, width: number, height: number, tileOrigin: string, budget = 16, outlines?: LineStyle): Promise<PaintedBasemap> {
    const tiles = await coveringTiles(layout, width, height, tileOrigin, budget)
    if (tiles.length === 0) {
        return { under: '', over: '' }
    }
    const cache = new Map<string, DecodedFeature[]>()
    const painted = layers
        .filter(layer => (layer.minZoom === undefined || layout.zoom >= layer.minZoom) && (layer.maxZoom === undefined || layout.zoom < layer.maxZoom))
        .map(layer => layerPath(layer, layout.zoom, tiles, width, height, cache))
        .join('')
    return {
        under: `<rect width="${width}" height="${height}" fill="${background}"/>${painted}`,
        over: outlines === undefined ? '' : layerPath({ sourceLayer: 'boundary', filter: subnationalOutlinesFilter as Expression, stroke: [[0, outlines.color]], width: [[0, outlines.weight]] }, layout.zoom, tiles, width, height, cache),
    }
}
