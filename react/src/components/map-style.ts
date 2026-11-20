import maplibregl, { RequestTransformFunction, StyleSpecification } from 'maplibre-gl'
import { Protocol } from 'pmtiles'

import mapStyleJson from '../data/map_style.json'

maplibregl.addProtocol('pmtiles', new Protocol().tile)

const style = mapStyleJson as unknown as StyleSpecification & { metadata: { 'urbanstats:jost_fonts': Record<string, { ranges: number[], fallback: string } | undefined> } }

let resolvedStyle: StyleSpecification | undefined

// MapLibre requires glyph and source URLs to be absolute
export function mapStyle(): StyleSpecification {
    const transit = style.sources.transit as { url: string }
    return resolvedStyle ??= {
        ...style,
        // keeps the braces, which URL would escape
        glyphs: `${location.origin}${style.glyphs}`,
        sources: {
            ...style.sources,
            transit: { ...style.sources.transit, url: `pmtiles://${new URL(transit.url.slice('pmtiles://'.length), location.href).href}` } as StyleSpecification['sources'][string],
        },
    }
}

// only the ranges Jost covers are served by the site; the rest come from OpenFreeMap's Noto
export const mapTransformRequest: RequestTransformFunction = (url, resourceType) => {
    // ResourceType is a const enum, which the bundler can't inline
    const match = (resourceType as string | undefined) === 'Glyphs' && /\/map\/fonts\/([^/]+)\/(\d+-\d+)\.pbf$/.exec(url)
    const font = match ? style.metadata['urbanstats:jost_fonts'][decodeURIComponent(match[1])] : undefined
    if (match && font && !font.ranges.includes(parseInt(match[2]))) {
        return { url: `https://tiles.openfreemap.org/fonts/${encodeURIComponent(font.fallback)}/${match[2]}.pbf` }
    }
    return { url }
}

export const mapBackgroundColor = (style.layers.find(layer => layer.id === 'background') as { paint: { 'background-color': string } }).paint['background-color']
