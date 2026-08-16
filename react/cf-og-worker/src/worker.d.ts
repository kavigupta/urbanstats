/*
 * The slice of the Workers runtime this Worker touches, plus the module types wrangler's bundler
 * gives the bundled assets. Hand-written rather than taken from @cloudflare/workers-types, which
 * redeclares every global it shares with the DOM lib that the site's sources are typed against.
 * Names are Worker-prefixed because these land in the app's global scope too.
 */

interface WorkerEnv {
    // eslint-disable-next-line no-restricted-syntax -- The binding name comes from wrangler.toml.
    SITE_ORIGIN: string
}

interface WorkerContext {
    waitUntil: (promise: Promise<unknown>) => void
}

// The Workers-only shared cache. Everything else about `caches` matches the DOM's CacheStorage.
interface CacheStorage {
    default: Cache
}

interface RewriterElement {
    getAttribute: (name: string) => string | null
    setAttribute: (name: string, value: string) => void
    setInnerContent: (content: string) => void
}

interface RewriterHandler {
    element: (element: RewriterElement) => void
}

declare class HTMLRewriter {
    on: (selector: string, handler: RewriterHandler) => HTMLRewriter
    transform: (response: Response) => Response
}

// Bundled by the `[[rules]]` and default .wasm handling in wrangler.toml.
declare module '*.ttf' {
    const value: ArrayBuffer
    export default value
}

declare module '*.wasm' {
    const value: WebAssembly.Module
    export default value
}
