/*
 * A global script so the `declare module` wildcards and `caches` augmentation apply. Workers types are
 * imported inline since their ambient entry point clashes with the DOM lib. Names are Worker-prefixed
 * because they're global in the app too.
 */

interface WorkerEnv {
    // eslint-disable-next-line no-restricted-syntax -- The binding name comes from wrangler.toml.
    SITE_ORIGIN: string
}

type WorkerContext = import('@cloudflare/workers-types').ExecutionContext

// The Workers-only shared cache. Everything else about `caches` matches the DOM's CacheStorage.
interface CacheStorage {
    default: Cache
}

type RewriterElement = import('@cloudflare/workers-types').Element

type RewriterHandler = import('@cloudflare/workers-types').HTMLRewriterElementContentHandlers

// Hand-written because the runtime's `transform` uses the Workers Response rather than the DOM's.
declare class HTMLRewriter {
    on: (selector: string, handler: RewriterHandler) => HTMLRewriter
    transform: (response: Response) => Response
}

// Bundled by the `[[rules]]` and default .wasm handling in wrangler.toml.
declare module '*.ttf' {
    const value: ArrayBuffer
    export default value
}

declare module '*.svg' {
    const value: string
    export default value
}

declare module '*.wasm' {
    const value: WebAssembly.Module
    export default value
}
