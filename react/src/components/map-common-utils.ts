export function keptByNoBasemap(layer: { id: string, source: string }): boolean {
    return layer.id === 'background' || layer.source !== 'openmaptiles'
}
