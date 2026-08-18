// Safari before 16.4 and Firefox before 113 lack the Compression Streams API.
async function installPolyfill(): Promise<void> {
    if (typeof CompressionStream !== 'undefined') {
        return
    }
    const { makeCompressionStream, makeDecompressionStream } = await import('compression-streams-polyfill/ponyfill')
    globalThis.CompressionStream = makeCompressionStream(TransformStream)
    globalThis.DecompressionStream = makeDecompressionStream(TransformStream)
}

async function pipe(data: ReadableStream<Uint8Array>, through: GenericTransformStream): Promise<Uint8Array> {
    return new Uint8Array(await new Response(data.pipeThrough(through)).arrayBuffer())
}

export async function gzip(data: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    await installPolyfill()
    return pipe(data, new CompressionStream('gzip'))
}

export async function gunzip(data: ReadableStream<Uint8Array>): Promise<Uint8Array> {
    await installPolyfill()
    return pipe(data, new DecompressionStream('gzip'))
}
