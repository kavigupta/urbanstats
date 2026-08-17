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
    // Node's (De)CompressionStream never completes when fed a bare ArrayBuffer, so pass a view.
    const chunk = ArrayBuffer.isView(data) ? data : new Uint8Array(data)
    const source = new ReadableStream<BufferSource>({
        start(controller) {
            controller.enqueue(chunk)
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
