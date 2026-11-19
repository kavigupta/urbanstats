import { RequestTransformFunction, StyleSpecification } from 'maplibre-gl'

import mapStyleJson from '../data/map_style.json'

const style = mapStyleJson as unknown as StyleSpecification & { metadata: { 'urbanstats:jost_fonts': Record<string, { ranges: number[], fallback: string } | undefined> } }

let resolvedStyle: StyleSpecification | undefined

// MapLibre requires glyph URLs to be absolute
export function mapStyle(): StyleSpecification {
    return resolvedStyle ??= {
        ...style,
        // keeps the braces, which URL would escape
        glyphs: `${location.origin}${style.glyphs}`,
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
