/*
 * A basemap drawn from openfreemap's vector tiles, the same source the site's own maps read.
 *
 * maplibre cannot run here: it wants a GL context, and a Worker has neither that nor a DOM. So the
 * tiles are decoded and painted by hand into SVG, which satori and resvg already speak. The styling
 * below is a reading of openfreemap's "bright", not an implementation of the maplibre style spec.
 */
import { VectorTile, VectorTileLayer } from '@mapbox/vector-tile'
import Pbf from 'pbf'

import { MapLayout } from './map-layout'

/** Where openfreemap's own data stops. Anything closer in draws these tiles larger. */
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

// Casings are drawn under every fill rather than under their own, so a road passing beneath another
// does not cut a notch in it.
const motorwayWidth: [number, number][] = [[5, 0.5], [7, 1.5], [12, 6], [16, 14]]
const trunkWidth: [number, number][] = [[7, 0.5], [9, 1.5], [12, 5], [16, 13]]
const secondaryWidth: [number, number][] = [[9, 0.5], [13, 4], [16, 11]]
const minorWidth: [number, number][] = [[12, 0.5], [14, 3], [16, 8]]

/* eslint-disable no-restricted-syntax -- openfreemap's "bright" palette, read off its style JSON. */
const background = '#f8f4f0'

const rules: Rule[] = [
    { layer: 'landcover', where: p => p.class === 'wood', fill: '#66aa44', opacity: 0.1 },
    { layer: 'landcover', where: p => p.class === 'grass', fill: '#d8e8c8' },
    { layer: 'landcover', where: p => p.class === 'sand', fill: '#f5eebc' },
    { layer: 'landcover', where: p => p.class === 'ice', fill: '#ffffff', opacity: 0.5 },
    { layer: 'landuse', where: p => p.class === 'residential' || p.class === 'suburb', fill: '#eae6e1', opacity: 0.4 },
    { layer: 'landuse', where: p => p.class === 'commercial', fill: '#f2caca', opacity: 0.23 },
    { layer: 'landuse', where: p => p.class === 'industrial', fill: '#fff4c2', opacity: 0.34 },
    { layer: 'landuse', where: p => p.class === 'cemetery', fill: '#e0e4dd' },
    { layer: 'landuse', where: p => p.class === 'hospital', fill: '#ffddee' },
    { layer: 'landuse', where: p => p.class === 'school', fill: '#f0e8f8' },
    { layer: 'park', fill: '#d8e8c8', opacity: 0.35 },
    { layer: 'water', where: p => p.intermittent !== 1 && p.brunnel !== 'tunnel', fill: '#aecfe2' },
    { layer: 'waterway', stroke: '#a0c8f0', width: [[10, 0.8], [14, 1.5], [17, 4]] },
    { layer: 'aeroway', where: p => p.class === 'runway' || p.class === 'taxiway', stroke: '#dddddd', width: [[11, 2], [16, 12]] },

    { layer: 'transportation', where: roadClass('minor', 'service', 'track'), stroke: '#cfcdca', width: minorWidth, minZoom: 12 },
    { layer: 'transportation', where: roadClass('secondary', 'tertiary'), stroke: '#e9ac77', width: secondaryWidth },
    { layer: 'transportation', where: roadClass('trunk', 'primary'), stroke: '#e9ac77', width: trunkWidth },
    { layer: 'transportation', where: roadClass('motorway'), stroke: '#e9ac77', width: motorwayWidth },

    { layer: 'transportation', where: roadClass('path'), stroke: '#ccbbaa', width: [[14, 0.8], [18, 3]], minZoom: 14 },
    { layer: 'transportation', where: roadClass('rail'), stroke: '#bbbbbb', width: [[12, 0.5], [18, 2]], minZoom: 11 },
    { layer: 'building', fill: '#e0dcd8', minZoom: 14 },
    { layer: 'transportation', where: roadClass('minor', 'service', 'track'), stroke: '#ffffff', width: minorWidth.map(([z, w]): [number, number] => [z, Math.max(w - 1.2, 0.4)]), minZoom: 12 },
    { layer: 'transportation', where: roadClass('secondary', 'tertiary'), stroke: '#ffeeaa', width: secondaryWidth.map(([z, w]): [number, number] => [z, Math.max(w - 1.4, 0.4)]) },
    { layer: 'transportation', where: roadClass('trunk', 'primary'), stroke: '#ffeeaa', width: trunkWidth.map(([z, w]): [number, number] => [z, Math.max(w - 1.6, 0.4)]) },
    { layer: 'transportation', where: roadClass('motorway'), stroke: '#ffcc88', width: motorwayWidth.map(([z, w]): [number, number] => [z, Math.max(w - 1.8, 0.4)]) },

    { layer: 'boundary', where: p => Number(p.admin_level) >= 3 && Number(p.admin_level) <= 6 && p.maritime !== 1, stroke: '#b3b3b3', width: [[7, 1], [11, 2]], dash: '2 2' },
    { layer: 'boundary', where: p => Number(p.admin_level) === 2 && p.maritime !== 1, stroke: '#a8a6b0', width: [[3, 1], [12, 3]] },
]
/* eslint-enable no-restricted-syntax */

interface Tile {
    tile: VectorTile
    /** Where this tile's top-left corner falls in the card's map box. */
    left: number
    top: number
    px: number
}

let tileTemplate: Promise<string> | undefined

/** Read from the TileJSON because openfreemap versions its tile path by planet build. */
async function templateUrl(): Promise<string> {
    tileTemplate ??= fetch('https://tiles.openfreemap.org/planet')
        .then(async response => ((await response.json()) as { tiles: string[] }).tiles[0])
    try {
        return await tileTemplate
    }
    catch (error) {
        // Otherwise one failed lookup poisons the isolate for as long as it lives.
        tileTemplate = undefined
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

async function coveringTiles(layout: MapLayout, width: number, height: number): Promise<Tile[]> {
    const zoom = Math.min(layout.zoom, dataMaxZoom)
    const px = layout.scale / 2 ** zoom
    const across = 2 ** zoom
    const range = (origin: number, extent: number): number[] => {
        const first = Math.floor(origin / px)
        const last = Math.floor((origin + extent) / px)
        return Array.from({ length: last - first + 1 }, (_, i) => first + i)
    }

    const template = await templateUrl()
    const wanted = range(layout.originX, width).flatMap(x => range(layout.originY, height).map(y => ({ x, y })))
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

/**
 * Every feature a rule matches, as one path rather than one apiece: a dense tile holds thousands of
 * roads, and resvg has to parse whatever we emit.
 */
function rulePath(rule: Rule, strokeWidth: number, tiles: Tile[], width: number, height: number): string {
    const parts: string[] = []
    for (const { tile, left, top, px } of tiles) {
        if (!Object.hasOwn(tile.layers, rule.layer)) {
            continue
        }
        const layer: VectorTileLayer = tile.layers[rule.layer]
        const unit = px / layer.extent
        for (let i = 0; i < layer.length; i++) {
            const feature = layer.feature(i)
            if (feature.type === 1 || (rule.where !== undefined && !rule.where(feature.properties))) {
                continue
            }
            for (const ring of feature.loadGeometry()) {
                // Tiles carry a buffer of geometry beyond their own edges, which neighbouring tiles
                // repeat. Dropping what falls outside the card keeps both out of the SVG.
                const points: string[] = []
                let visible = false
                for (const point of ring) {
                    const x = left + point.x * unit
                    const y = top + point.y * unit
                    visible ||= x >= 0 && x <= width && y >= 0 && y <= height
                    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
                }
                if (!visible || points.length < 2) {
                    continue
                }
                parts.push(`M${points.join('L')}${feature.type === 3 ? 'Z' : ''}`)
            }
        }
    }
    if (parts.length === 0) {
        return ''
    }

    const paint = rule.fill !== undefined
        ? `fill="${rule.fill}"`
        : `fill="none" stroke="${rule.stroke}" stroke-width="${strokeWidth.toFixed(2)}" stroke-linejoin="round" stroke-linecap="round"${rule.dash === undefined ? '' : ` stroke-dasharray="${rule.dash}"`}`
    const opacity = rule.opacity === undefined ? '' : ` opacity="${rule.opacity}"`
    return `<path d="${parts.join('')}" ${paint}${opacity}/>`
}

/** SVG markup sized to the map box. Empty if no tile could be loaded. */
export async function basemap(layout: MapLayout, width: number, height: number): Promise<string> {
    const tiles = await coveringTiles(layout, width, height)
    if (tiles.length === 0) {
        return ''
    }
    const painted = rules
        .filter(rule => rule.minZoom === undefined || layout.zoom >= rule.minZoom)
        .map(rule => rulePath(rule, rule.width === undefined ? 1 : widthAt(rule.width, layout.zoom), tiles, width, height))
        .join('')
    return `<rect width="${width}" height="${height}" fill="${background}"/>${painted}`
}
