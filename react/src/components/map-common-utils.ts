import type { FilterSpecification } from 'maplibre-gl'

// Probably useful to make sure we don't collide with premade layers
export const urbanStatsLayerPrefix = 'urban-stats'

// The link preview card evaluates this too, so it can only use what cf-og-worker/src/style-filter.ts implements.
export const subnationalOutlinesFilter: FilterSpecification = [
    'all',
    ['<=', ['get', 'admin_level'], 4],
    ['!=', ['get', 'maritime'], 1],
    ['!=', ['get', 'disputed'], 1],
    ['!', ['has', 'claimed_by']],
]

export function keptByNoBasemap(layer: { id: string, source: string }): boolean {
    return layer.id === 'background' || !['openmaptiles', 'transit'].includes(layer.source)
}

// openfreemap's credit line, as its TileJSON states it.
export const tileAttributionParts = [
    { text: 'OpenFreeMap', href: 'https://openfreemap.org' },
    { text: '© OpenMapTiles', href: 'https://www.openmaptiles.org/' },
    { text: 'Data from OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
]

// For canvases and cards, which cannot carry the links
export const tileAttribution = tileAttributionParts.map(part => part.text).join(' · ')
