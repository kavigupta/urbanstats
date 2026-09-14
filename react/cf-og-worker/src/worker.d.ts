/*
 * The slice of the Workers runtime this Worker touches, plus the module types wrangler's bundler
 * gives the bundled assets. A global script rather than a module, so that the `declare module`
 * wildcards and the `caches` augmentation below apply -- hence inline `import(...)` for the types
 * taken from @cloudflare/workers-types, whose ambient entry point would redeclare every global it
 * shares with the DOM lib that the site's sources are typed against.
 * Names are Worker-prefixed because these land in the app's global scope too.
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

// Hand-written where the runtime's own HTMLRewriter is not: its `transform` takes and returns the
// Workers Response rather than the DOM one the rest of this Worker is checked against.
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
