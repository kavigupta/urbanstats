// Probably useful to make sure we don't collide with premade layers
export const urbanStatsLayerPrefix = 'urban-stats'

export function keptByNoBasemap(layer: { id: string, source: string }): boolean {
    return layer.id === 'background' || layer.source !== 'openmaptiles'
}

// openfreemap's credit line, as its TileJSON states it.
export const tileAttributionParts = [
    { text: 'OpenFreeMap', href: 'https://openfreemap.org' },
    { text: '© OpenMapTiles', href: 'https://www.openmaptiles.org/' },
    { text: 'Data from OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' },
]

// For canvases and cards, which cannot carry the links
export const tileAttribution = tileAttributionParts.map(part => part.text).join(' · ')
