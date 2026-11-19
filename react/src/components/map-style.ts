import maplibregl, { RequestTransformFunction, StyleSpecification } from 'maplibre-gl'
import { Protocol } from 'pmtiles'

import mapStyleJson from '../data/map_style.json'

maplibregl.addProtocol('pmtiles', new Protocol().tile)

const style = mapStyleJson as unknown as StyleSpecification & { metadata: { 'urbanstats:jost_ranges': number[] } }

let resolvedStyle: StyleSpecification | undefined

// MapLibre requires sprite, glyph and source URLs to be absolute, and checks the sprite's before transformRequest
export function mapStyle(): StyleSpecification {
    if (resolvedStyle === undefined) {
        const absolute = (url: string): string => new URL(url, location.href).href
        const transit = style.sources.transit as { url: string }
        resolvedStyle = {
            ...style,
            sprite: (style.sprite as { id: string, url: string }[]).map(sprite => ({ ...sprite, url: absolute(sprite.url) })),
            // keeps the braces, which URL would escape
            glyphs: `${location.origin}${style.glyphs}`,
            sources: {
                ...style.sources,
                transit: { ...style.sources.transit, url: `pmtiles://${absolute(transit.url.slice('pmtiles://'.length))}` } as StyleSpecification['sources'][string],
            },
        }
    }
    return resolvedStyle
}

const jostRanges = new Set(style.metadata['urbanstats:jost_ranges'])

// only the ranges Jost covers are served by the site; the rest come from OpenFreeMap's Noto
export const mapTransformRequest: RequestTransformFunction = (url, resourceType) => {
    // ResourceType is a const enum, which the bundler can't inline
    const match = (resourceType as string | undefined) === 'Glyphs' && /\/map\/fonts\/Jost(?: |%20)(\w+)\/(\d+)-(\d+)\.pbf$/.exec(url)
    if (match && !jostRanges.has(Number(match[2]))) {
        const noto = { Regular: 'Regular', Medium: 'Regular', 550: 'Bold', Bold: 'Bold', Italic: 'Italic' }[match[1]]
        return { url: `https://tiles.openfreemap.org/fonts/Noto%20Sans%20${noto}/${match[2]}-${match[3]}.pbf` }
    }
    return { url }
}

export const mapBackgroundColor = (style.layers.find(layer => layer.id === 'background') as { paint: { 'background-color': string } }).paint['background-color']
