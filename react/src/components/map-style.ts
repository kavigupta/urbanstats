import { RequestTransformFunction, StyleSpecification } from 'maplibre-gl'

import mapStyleJson from '../data/map_style.json'

const style = mapStyleJson as unknown as StyleSpecification & { metadata: { 'urbanstats:jost_ranges': number[] } }

let resolvedStyle: StyleSpecification | undefined

// MapLibre requires glyph URLs to be absolute
export function mapStyle(): StyleSpecification {
    return resolvedStyle ??= {
        ...style,
        // keeps the braces, which URL would escape
        glyphs: `${location.origin}${style.glyphs}`,
    }
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
