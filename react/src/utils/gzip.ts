// Safari before 16.4 and Firefox before 113 lack the Compression Streams API.
async function installPolyfill(): Promise<void> {
    if (typeof CompressionStream !== 'undefined') {
        return
    }
    const { makeCompressionStream, makeDecompressionStream } = await import('compression-streams-polyfill/ponyfill')
    globalThis.CompressionStream = makeCompressionStream(TransformStream)
    globalThis.DecompressionStream = makeDecompressionStream(TransformStream)
}

async function pipe(data: BufferSource, through: GenericTransformStream): Promise<Uint8Array> {
    const source = new ReadableStream<BufferSource>({
        start(controller) {
            controller.enqueue(data)
            controller.close()
        },
    })
    return new Uint8Array(await new Response(source.pipeThrough(through)).arrayBuffer())
}

export async function gzip(data: BufferSource): Promise<Uint8Array> {
    await installPolyfill()
    return pipe(data, new CompressionStream('gzip'))
}

export async function gunzip(data: BufferSource): Promise<Uint8Array> {
    await installPolyfill()
    return pipe(data, new DecompressionStream('gzip'))
}
