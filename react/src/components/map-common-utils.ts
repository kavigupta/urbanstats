export function keptByNoBasemap(layer: { type: string, source: string }): boolean {
    return layer.type === 'background' || layer.source !== 'openmaptiles'
}
