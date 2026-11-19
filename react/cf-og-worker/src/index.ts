/*
 * Gives pages per-URL link embeds. Every article shares one static article.html, so this rewrites the
 * meta tags per query string and renders the og:image from the site's static data.
 */
// Must come first, since the site's modules touch browser globals as they load.
// eslint-disable-next-line import/no-unassigned-import -- Installing those globals is the point.
import './browser-shim'

import { PageDescriptor, pageDescriptorFromURL } from '../../src/navigation/PageDescriptor'

interface Embed {
    title: string
    description: string
    image?: string
}

/** Approximate, since loading the real one would fetch the article on every HTML request, browsers included. */
function shortenLongname(longname: string): string {
    return longname.split(',')[0]
}

/** Reads the script without running it, which would load statistics on every HTML request. */
async function describeMap(settings: string | undefined): Promise<{ title: string, description: string } | undefined> {
    try {
        // Deferred like render.ts, since this pulls in every USS constant.
        const { dedupeGeographies, describeGeographies, mapSettingsFromURLParam, mapTitle } = await import('../../src/mapper/settings/utils')
        const mapSettings = await mapSettingsFromURLParam(settings)
        const title = mapTitle(mapSettings, {})
        const geographies = dedupeGeographies(mapSettings.geographies)
        if (title === undefined || geographies.length === 0) {
            return undefined
        }
        return {
            title,
            description: `${title} mapped over ${describeGeographies(geographies)}, on Urban Stats.`,
        }
    }
    catch {
        // Any script we can't read this much out of falls back to the generic tags.
        return undefined
    }
}

/** Reads the script without running it, like describeMap. */
async function describeTable(descriptor: Extract<PageDescriptor, { kind: 'statistic' }> & { uss: string }): Promise<string | undefined> {
    try {
        // Deferred like describeMap's imports.
        const { parseStatUSS, tableTitle } = await import('../../src/stat/utils')
        return tableTitle(parseStatUSS(descriptor.uss, descriptor.geographies), descriptor.geographies, {})
    }
    catch {
        // Any script we cannot read a title out of falls back to the generic one.
        return undefined
    }
}

async function describe(url: URL): Promise<Embed | undefined> {
    let descriptor
    try {
        descriptor = pageDescriptorFromURL(url)
    }
    catch {
        return undefined
    }
    switch (descriptor.kind) {
        case 'article':
            return {
                title: shortenLongname(descriptor.longname),
                description: `Statistics for ${descriptor.longname} on Urban Stats.`,
                image: new URL(`/og${url.pathname}${url.search}`, url.origin).toString(),
            }
        case 'comparison':
            return {
                title: descriptor.longnames.map(shortenLongname).join(' vs '),
                description: `Comparing ${descriptor.longnames.join(', ')} on Urban Stats.`,
                image: new URL(`/og${url.pathname}${url.search}`, url.origin).toString(),
            }
        case 'statistic': {
            const title = 'statname' in descriptor
                ? descriptor.statname
                : await describeTable(descriptor) ?? 'Urban Stats: Custom Table'
            return {
                title,
                description: `${title} rankings on Urban Stats.`,
                image: new URL(`/og${url.pathname}${url.search}`, url.origin).toString(),
            }
        }
        case 'mapper': {
            const map = await describeMap(descriptor.settings)
            return {
                title: map?.title ?? 'Urban Stats: Map',
                description: map?.description ?? 'A map made with Urban Stats.',
                image: new URL(`/og${url.pathname}${url.search}`, url.origin).toString(),
            }
        }
        default:
            return undefined
    }
}

class RewriteMeta implements RewriterHandler {
    constructor(private embed: Embed) {}

    element(element: RewriterElement): void {
        const key = element.getAttribute('property') ?? element.getAttribute('name')
        switch (key) {
            case 'og:title':
                element.setAttribute('content', this.embed.title)
                break
            case 'og:description':
                element.setAttribute('content', this.embed.description)
                break
            case 'og:image':
                // Left alone for pages we can describe but not draw.
                if (this.embed.image !== undefined) {
                    element.setAttribute('content', this.embed.image)
                }
                break
            default:
        }
    }
}

class RewriteTitle implements RewriterHandler {
    constructor(private embed: Embed) {}

    element(element: RewriterElement): void {
        element.setInnerContent(this.embed.title)
    }
}

let reloadEpoch: string | undefined

function servingLocalSite(env: WorkerEnv): boolean {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(env.SITE_ORIGIN)
}

/** Changes on a dev reload, since wrangler reloads by starting a fresh isolate. */
function isolateID(): string {
    // Not at module scope: Workers disallow generating randomness while the global scope evaluates.
    reloadEpoch ??= crypto.randomUUID()
    return reloadEpoch
}

/**
 * Deployed, keyed on the descriptor so appending `&x=1`, `&x=2`, ... can't force fresh renders.
 * Locally, keyed on the raw URL and isolate, so dev parameters count and code changes aren't hidden.
 */
function cacheKey(env: WorkerEnv, target: URL, descriptor: PageDescriptor): Request {
    if (!servingLocalSite(env)) {
        const key = new URL(target.pathname, target.origin)
        key.searchParams.set('card', JSON.stringify(descriptor))
        return new Request(key.toString(), { method: 'GET' })
    }
    const key = new URL(target)
    key.searchParams.set('__reload', isolateID())
    return new Request(key.toString(), { method: 'GET' })
}

const openfreemap = 'https://tiles.openfreemap.org'

/**
 * Locally, `__tiles` pins a tile snapshot for screenshots. Deployed it's ignored, or anyone could
 * choose what a card under urbanstats.org's name shows.
 */
function tileOrigin(env: WorkerEnv, target: URL): string {
    const snapshot = target.searchParams.get('__tiles')
    return servingLocalSite(env) && snapshot !== null ? snapshot : openfreemap
}

/*
 * A crawler shows no preview at all for a non-image response. Cached briefly, so a transient
 * failure doesn't stick.
 */
async function staticPreview(env: WorkerEnv): Promise<Response> {
    const png = await fetch(new URL('/link-preview.png', env.SITE_ORIGIN).toString())
    return new Response(png.body, {
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=300' },
    })
}

async function renderImage(env: WorkerEnv, target: URL, ctx: WorkerContext): Promise<Response> {
    let descriptor
    try {
        descriptor = pageDescriptorFromURL(target)
    }
    catch {
        return new Response('unrecognized url', { status: 400 })
    }
    // The kinds with a renderer; the rest keep the site's static preview image.
    if (descriptor.kind !== 'article' && descriptor.kind !== 'comparison' && descriptor.kind !== 'mapper' && descriptor.kind !== 'statistic') {
        return new Response('nothing to draw', { status: 404 })
    }

    const cache = caches.default
    const key = cacheKey(env, target, descriptor)
    const cached = await cache.match(key)
    if (cached !== undefined) {
        return cached
    }

    let png
    try {
        // Deferred so that only a render evaluates the drawing half. See render.ts.
        const { renderCard } = await import('./render')
        png = await renderCard(env.SITE_ORIGIN, descriptor, tileOrigin(env, target))
    }
    catch (error) {
        console.error(error)
    }
    if (png === undefined) {
        return staticPreview(env)
    }

    const response = new Response(png, {
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' },
    })
    ctx.waitUntil(cache.put(key, response.clone()))
    return response
}

/* For the embed-preview dev panel, which the local site serves from another port. */
function devCors(response: Response, request: Request): Response {
    const origin = request.headers.get('origin')
    if (origin === null || !/^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin)) {
        return response
    }
    const withCors = new Response(response.body, response)
    withCors.headers.set('access-control-allow-origin', origin)
    return withCors
}

export default {
    async fetch(request: Request, env: WorkerEnv, ctx: WorkerContext): Promise<Response> {
        const url = new URL(request.url)

        // Tells the preview panel when the Worker reloads. Held open rather than polled, to keep the
        // request log quiet.
        if (servingLocalSite(env) && url.pathname === '/__reload') {
            const encoder = new TextEncoder()
            const body = new ReadableStream({
                start(controller) {
                    controller.enqueue(encoder.encode(`retry: 500\ndata: ${isolateID()}\n\n`))
                },
                // A stream with nothing pending on it is canceled as a hang, so it has to tick.
                pull: async (controller) => {
                    await new Promise(resolve => setTimeout(resolve, 30000))
                    controller.enqueue(encoder.encode(':\n\n'))
                },
            })
            const response = new Response(body, {
                headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-store' },
            })
            return devCors(response, request)
        }

        if (url.pathname.startsWith('/og/')) {
            const target = new URL(url.pathname.slice('/og'.length) + url.search, env.SITE_ORIGIN)
            return devCors(await renderImage(env, target, ctx), request)
        }

        const embed = await describe(url)

        // Not a loop: Cloudflare sends a Worker's subrequest matching its own routes to the origin.
        const origin = await fetch(new URL(url.pathname + url.search, env.SITE_ORIGIN).toString(), request)
        if (embed === undefined || !(origin.headers.get('content-type') ?? '').includes('text/html')) {
            return devCors(origin, request)
        }

        const rewritten = new HTMLRewriter()
            .on('meta', new RewriteMeta(embed))
            .on('title', new RewriteTitle(embed))
            .transform(origin)
        return devCors(rewritten, request)
    },
}
