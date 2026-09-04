// Probably useful to make sure we don't collide with premade layers
export const urbanStatsLayerPrefix = 'urban-stats'

export function keptByNoBasemap(layer: { id: string, source: string }): boolean {
    return layer.id === 'background' || layer.source !== 'openmaptiles'
}
