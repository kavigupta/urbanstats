/*
 * Paints openfreemap's vector tiles into SVG by hand, since maplibre needs a GL context and a DOM.
 * The paint comes from the site's style, through card_basemap.json; which features each rule draws is written here.
 */
import { VectorTile, VectorTileFeature } from '@mapbox/vector-tile'
import Pbf from 'pbf'

import cardBasemap from '../../src/data/card_basemap.json'
import { LineStyle } from '../../src/mapper/settings/utils'

import { MapLayout, polyline } from './map-layout'

/** openfreemap has no tiles past this zoom. */
const dataMaxZoom = 14

type Props = Record<string, string | number | boolean>

type Stops<T> = [zoom: number, value: T][]

interface Paint {
    fill?: Stops<string>
    stroke?: Stops<string>
    width?: Stops<number>
    opacity?: Stops<number>
    /** In line widths */
    dash?: number[]
    minZoom?: number
}

interface Rule extends Paint {
    layer: string
    /** Absent means all of the layer's features. */
    where?: (props: Props) => boolean
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

const roadClass = (...classes: string[]) => (props: Props): boolean => classes.includes(String(props.class))

const paints = cardBasemap.layers as unknown as Record<keyof typeof cardBasemap.layers, Paint>

const background = cardBasemap.background

const isBorder = (p: Props): boolean => p.disputed !== 1 && !Object.hasOwn(p, 'claimed_by')

const rules: Rule[] = [
    // The band along each border, under everything else.
    { layer: 'boundary', where: p => Number(p.admin_level) >= 3 && Number(p.admin_level) <= 4 && isBorder(p), ...paints['boundary_3-highlight/4'] },
    { layer: 'boundary', where: p => Number(p.admin_level) === 2 && p.maritime !== 1 && isBorder(p), ...paints['boundary_2-highlight/2'] },

    { layer: 'landcover', where: p => p.class === 'wood', ...paints['landcover-wood'] },
    { layer: 'landcover', where: p => p.class === 'grass' && p.subclass !== 'scrub' && p.subclass !== 'heath', ...paints['landcover-grass'] },
    { layer: 'landcover', where: p => p.class === 'grass' && (p.subclass === 'scrub' || p.subclass === 'heath'), ...paints['landcover-scrub'] },
    { layer: 'landcover', where: p => p.class === 'sand', ...paints['landcover-sand'] },
    { layer: 'landcover', where: p => p.subclass === 'glacier', ...paints['landcover-glacier'] },
    { layer: 'landcover', where: p => p.subclass === 'ice_shelf', ...paints['landcover-ice-shelf'] },
    { layer: 'landuse', where: p => ['dam', 'garages', 'industrial'].includes(String(p.class)), ...paints['landuse-industrial'] },
    { layer: 'landuse', where: p => p.class === 'hospital', ...paints['landuse-hospital'] },
    { layer: 'landuse', where: p => p.class === 'school', ...paints['landuse-school'] },
    { layer: 'landuse', where: p => p.class === 'cemetery', ...paints['landuse-cemetery'] },
    { layer: 'park', where: p => ['national_park', 'wilderness_preserve', 'State Park'].includes(String(p.class)), ...paints['park-fill'] },
    { layer: 'park', where: p => p.class === 'public_park', ...paints['landcover-grass-park'] },
    { layer: 'water', where: p => p.intermittent !== 1 && p.brunnel !== 'tunnel', ...paints.water },
    { layer: 'waterway', where: p => p.class === 'river' && p.brunnel !== 'tunnel', ...paints['waterway-river'] },
    { layer: 'waterway', where: p => (p.class === 'stream' || p.class === 'canal') && p.brunnel !== 'tunnel', ...paints['waterway-stream-canal'] },
    { layer: 'waterway', where: p => !['river', 'stream', 'canal'].includes(String(p.class)), ...paints['waterway-other'] },
    { layer: 'aeroway', where: p => p.class === 'taxiway', ...paints['aeroway-taxiway-casing'] },
    { layer: 'aeroway', where: p => p.class === 'runway', ...paints['aeroway-runway-casing'] },

    // Casings first, so a road passing beneath another does not cut a notch in it. Only the motorway's shows.
    { layer: 'transportation', where: roadClass('motorway'), ...paints['highway-motorway-casing'] },

    { layer: 'transportation', where: roadClass('rail'), ...paints.railway },
    { layer: 'transportation', where: roadClass('transit'), ...paints['railway-transit'] },
    { layer: 'transportation', where: roadClass('minor', 'service', 'track'), ...paints['highway-minor'] },
    { layer: 'transportation', where: roadClass('secondary', 'tertiary'), ...paints['highway-secondary-tertiary'] },
    { layer: 'transportation', where: roadClass('primary'), ...paints['highway-primary'] },
    { layer: 'transportation', where: roadClass('trunk'), ...paints['highway-trunk'] },
    { layer: 'transportation', where: roadClass('motorway'), ...paints['highway-motorway'] },

    { layer: 'boundary', where: p => Number(p.admin_level) >= 3 && Number(p.admin_level) <= 4 && p.maritime !== 1 && isBorder(p), ...paints['boundary_3/4'] },
    { layer: 'boundary', where: p => Number(p.admin_level) >= 5 && Number(p.admin_level) <= 6 && p.maritime !== 1 && isBorder(p), ...paints['boundary_3/6'] },
    { layer: 'boundary', where: p => Number(p.admin_level) === 2 && p.maritime !== 1 && isBorder(p), ...paints['boundary_2/2'] },
]

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

function rulePath(rule: Rule, zoom: number, tiles: Tile[], width: number, height: number, cache: Map<string, DecodedFeature[]>): string {
    const strokeWidth = rule.width === undefined ? 1 : numberAt(rule.width, zoom)
    const opacityValue = rule.opacity === undefined ? 1 : numberAt(rule.opacity, zoom)
    if (strokeWidth <= 0 || opacityValue <= 0) {
        return ''
    }
    const paint = rule.fill !== undefined
        ? `fill="${colorAt(rule.fill, zoom)}"`
        : `fill="none" stroke="${colorAt(rule.stroke!, zoom)}" stroke-width="${strokeWidth.toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"${rule.dash === undefined ? '' : ` stroke-dasharray="${rule.dash.map(d => (d * strokeWidth).toFixed(2)).join(' ')}"`}`
    const opacity = rule.opacity === undefined ? '' : ` opacity="${opacityValue.toFixed(3)}"`
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
        .map(rule => rulePath(rule, layout.zoom, tiles, width, height, cache))
        .join('')
    return {
        under: `<rect width="${width}" height="${height}" fill="${background}"/>${painted}`,
        over: outlines === undefined ? '' : rulePath({ ...subnationals, stroke: [[0, outlines.color]], width: [[0, outlines.weight]] }, layout.zoom, tiles, width, height, cache),
    }
}
