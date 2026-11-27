/*
 * Paints openfreemap's vector tiles into SVG by hand, since maplibre needs a GL context and a DOM.
 * The styling approximates openfreemap's "bright" rather than implementing the maplibre style spec.
 */
import { VectorTile, VectorTileFeature } from '@mapbox/vector-tile'
import Pbf from 'pbf'

import { LineStyle } from '../../src/mapper/settings/utils'

import { MapLayout, polyline } from './map-layout'

/** openfreemap has no tiles past this zoom. */
const dataMaxZoom = 14

type Props = Record<string, string | number | boolean>

interface Rule {
    layer: string
    /** Absent means all of the layer's features. */
    where?: (props: Props) => boolean
    fill?: string
    stroke?: string
    width?: [zoom: number, px: number][]
    opacity?: number
    dash?: string
    minZoom?: number
}

function widthAt(stops: [number, number][], zoom: number): number {
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

const roadClass = (...classes: string[]) => (props: Props): boolean => classes.includes(String(props.class))

const motorwayWidth: [number, number][] = [[8.5, 0], [9, 1.15], [12, 1.3], [15, 1.6], [17, 2.6], [20, 5]]
const motorwayCasingWidth: [number, number][] = [[8, 1.1], [9, 3.45], [12, 3.9], [15, 4.8], [17, 7.8], [20, 15]]
const trunkWidth: [number, number][] = [[6, 1.6], [12, 2.08], [15, 2.56], [17, 4.16], [20, 8]]
const secondaryWidth: [number, number][] = [[6, 1.25], [12, 1.625], [15, 2], [17, 3.25], [20, 6.25]]
const minorWidth: [number, number][] = [[6, 1], [12, 1.3], [15, 1.6], [17, 2.6], [20, 5]]

/* eslint-disable no-restricted-syntax -- The site's map style, read off map_style.json. */
const background = '#fff8f0'

const isBorder = (p: Props): boolean => p.disputed !== 1 && !Object.hasOwn(p, 'claimed_by')

const rules: Rule[] = [
    // The band along each border, under everything else. The country's after the state's, so it stays on top.
    { layer: 'boundary', where: p => Number(p.admin_level) >= 3 && Number(p.admin_level) <= 4 && isBorder(p), stroke: '#fde2c0', width: [[3, 2.5], [8, 5.5], [14, 9]], minZoom: 5 },
    { layer: 'boundary', where: p => Number(p.admin_level) === 2 && p.maritime !== 1 && isBorder(p), stroke: '#fcddb3', width: [[3, 4], [8, 8], [14, 12.5]] },

    { layer: 'landcover', where: p => p.class === 'wood', fill: '#b9d896' },
    { layer: 'landcover', where: p => p.class === 'grass' && p.subclass !== 'scrub' && p.subclass !== 'heath', fill: '#d6e5bc' },
    { layer: 'landcover', where: p => p.class === 'grass' && (p.subclass === 'scrub' || p.subclass === 'heath'), fill: '#dee0b4' },
    { layer: 'landcover', where: p => p.class === 'sand', fill: '#e6daac' },
    { layer: 'landcover', where: p => p.subclass === 'glacier' || p.subclass === 'ice_shelf', fill: '#ffffff', opacity: 0.5 },
    { layer: 'landuse', where: p => ['dam', 'garages', 'industrial', 'hospital', 'school'].includes(String(p.class)), fill: '#f4dbe3' },
    { layer: 'landuse', where: p => p.class === 'cemetery', fill: '#d6e5bc' },
    { layer: 'park', where: p => ['national_park', 'wilderness_preserve', 'State Park', 'public_park'].includes(String(p.class)), fill: '#d6e5bc' },
    { layer: 'water', where: p => p.intermittent !== 1 && p.brunnel !== 'tunnel', fill: '#77cacc' },
    { layer: 'water', where: p => p.intermittent === 1, fill: '#77cacc', opacity: 0.5 },
    { layer: 'waterway', where: p => p.intermittent !== 1 && p.brunnel !== 'tunnel', stroke: '#77cacc', width: [[10, 0.8], [14, 1.5], [17, 4]] },
    { layer: 'waterway', where: p => p.intermittent === 1 && p.brunnel !== 'tunnel', stroke: '#77cacc', width: [[10, 0.8], [14, 1.5], [17, 4]], dash: '4 3' },
    // Buildings are the background's colour, so only their outlines show.
    { layer: 'building', stroke: '#d2cec9', minZoom: 16 },
    { layer: 'aeroway', where: p => p.class === 'runway' || p.class === 'taxiway', stroke: '#cba9da', width: [[11, 2], [16, 12]], minZoom: 12 },

    // Casings first, so a road passing beneath another does not cut a notch in it. Only the motorway's shows.
    { layer: 'transportation', where: roadClass('motorway'), stroke: '#f96d6d', width: motorwayCasingWidth, minZoom: 5 },

    { layer: 'transportation', where: p => roadClass('rail', 'transit')(p) && p.brunnel !== 'tunnel' && !Object.hasOwn(p, 'service'), stroke: '#8e8e8e', width: minorWidth },
    { layer: 'transportation', where: roadClass('minor', 'service', 'track'), stroke: '#c1beba', width: minorWidth, minZoom: 14 },
    { layer: 'transportation', where: roadClass('secondary', 'tertiary'), stroke: '#959496', width: secondaryWidth },
    { layer: 'transportation', where: roadClass('trunk', 'primary'), stroke: '#f96d6d', width: trunkWidth },
    { layer: 'transportation', where: roadClass('motorway'), stroke: '#f7aa41', width: motorwayWidth },

    { layer: 'boundary', where: p => Number(p.admin_level) >= 3 && Number(p.admin_level) <= 4 && p.maritime !== 1 && isBorder(p), stroke: '#4e525a', width: [[3, 0.5], [8, 1.1], [14, 1.8]], dash: '6 2 1 2', minZoom: 5 },
    { layer: 'boundary', where: p => Number(p.admin_level) >= 5 && Number(p.admin_level) <= 6 && p.maritime !== 1 && isBorder(p), stroke: '#4e525a', width: [[3, 0.3], [8, 0.6], [14, 1.1]], dash: '3.6 1.2 0.6 1.2', minZoom: 8 },
    { layer: 'boundary', where: p => Number(p.admin_level) === 2 && p.maritime !== 1 && isBorder(p), stroke: '#4e525a', width: [[3, 0.8], [8, 1.6], [14, 2.5]], dash: '9 3 1.5 3' },
]
/* eslint-enable no-restricted-syntax */

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

function rulePath(rule: Rule, strokeWidth: number, tiles: Tile[], width: number, height: number, cache: Map<string, DecodedFeature[]>): string {
    const paint = rule.fill !== undefined
        ? `fill="${rule.fill}"`
        : `fill="none" stroke="${rule.stroke}" stroke-width="${strokeWidth.toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"${rule.dash === undefined ? '' : ` stroke-dasharray="${rule.dash}"`}`
    const opacity = rule.opacity === undefined ? '' : ` opacity="${rule.opacity}"`
    return groupedPaths(
        decodedFeatures(tiles, rule.layer, width, height, cache),
        feature => rule.where === undefined || rule.where(feature.properties) ? `${paint}${opacity}` : undefined,
    )
}

/** The map's own subnational outlines, filtered the way the site's overlay layer filters them. */
const subnationals: Rule = {
    layer: 'boundary',
    where: p => Number(p.admin_level) <= 4 && p.maritime !== 1 && p.disputed !== 1 && !Object.hasOwn(p, 'claimed_by'),
}

/** SVG markup sized to the map box. Both halves empty if no tile could be loaded. */
export async function basemap(layout: MapLayout, width: number, height: number, tileOrigin: string, budget = 16, outlines?: LineStyle): Promise<PaintedBasemap> {
    const tiles = await coveringTiles(layout, width, height, tileOrigin, budget)
    if (tiles.length === 0) {
        return { under: '', over: '' }
    }
    const cache = new Map<string, DecodedFeature[]>()
    const painted = rules
        .filter(rule => rule.minZoom === undefined || layout.zoom >= rule.minZoom)
        .map(rule => rulePath(rule, rule.width === undefined ? 1 : widthAt(rule.width, layout.zoom), tiles, width, height, cache))
        .join('')
    return {
        under: `<rect width="${width}" height="${height}" fill="${background}"/>${painted}`,
        over: outlines === undefined ? '' : rulePath({ ...subnationals, stroke: outlines.color }, outlines.weight, tiles, width, height, cache),
    }
}
