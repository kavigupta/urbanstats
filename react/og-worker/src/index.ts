/*
 * Gives Urban Stats pages per-URL link embeds.
 *
 * Every article shares one static article.html with one fixed og:image, so a crawler asking for
 * ?longname=Chicago gets the generic preview. This rewrites the meta tags per query string on the
 * way through, and renders the image at the edge from the site's own static data files.
 */
// Must come first: it installs the browser globals the site's modules touch as they evaluate.
// eslint-disable-next-line import/no-unassigned-import -- Installing those globals is the point.
import './browser-shim'

import { pageDescriptorFromURL } from '../../src/navigation/PageDescriptor'

interface Embed {
    title: string
    description: string
    image?: string
}

/**
 * Approximates the shortname. Loading the page would give the real one, but that means fetching the
 * article's data on every HTML request, browsers included, for something only a crawler reads.
 */
function shortenLongname(longname: string): string {
    return longname.split(',')[0]
}

function describe(url: URL): Embed | undefined {
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
                // Only articles have a renderer; the rest keep the static preview image.
                image: new URL(`/og${url.pathname}${url.search}`, url.origin).toString(),
            }
        case 'comparison':
            return {
                title: descriptor.longnames.map(shortenLongname).join(' vs '),
                description: `Comparing ${descriptor.longnames.join(', ')} on Urban Stats.`,
            }
        case 'statistic': {
            const title = 'statname' in descriptor ? descriptor.statname : 'Urban Stats: Custom Table'
            return { title, description: `${title} rankings on Urban Stats.` }
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
 * Keyed by isolate in dev, so an edit to the card's code is not hidden behind a day-old render.
 * Deployed, a new isolate means nothing more than the last one going idle.
 */
function cacheKey(env: WorkerEnv, target: URL): Request {
    if (!servingLocalSite(env)) {
        return new Request(target.toString(), { method: 'GET' })
    }
    const key = new URL(target)
    key.searchParams.set('__reload', isolateID())
    return new Request(key.toString(), { method: 'GET' })
}

async function renderImage(env: WorkerEnv, target: URL, ctx: WorkerContext): Promise<Response> {
    const cache = caches.default
    const key = cacheKey(env, target)
    const cached = await cache.match(key)
    if (cached !== undefined) {
        return cached
    }

    let descriptor
    try {
        descriptor = pageDescriptorFromURL(target)
    }
    catch {
        return new Response('unrecognized url', { status: 400 })
    }

    // Deferred so that only a render evaluates the drawing half. See render.ts.
    const { renderCard } = await import('./render')
    const png = await renderCard(env.SITE_ORIGIN, descriptor)
    if (png === undefined) {
        return new Response('nothing to draw', { status: 404 })
    }

    const response = new Response(png, {
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' },
    })
    ctx.waitUntil(cache.put(key, response.clone()))
    return response
}

/*
 * Lets the embed-preview dev panel read what a crawler would see: it is served by the local site on
 * one port and talks to this Worker on another. Nothing deployed is ever a localhost origin.
 */
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

        // The preview panel polls this to see the card's code reload, which the site's own dev
        // server knows nothing about.
        if (servingLocalSite(env) && url.pathname === '/__reload') {
            const response = new Response(isolateID(), { headers: { 'cache-control': 'no-store' } })
            return devCors(response, request)
        }

        if (url.pathname.startsWith('/og/')) {
            const target = new URL(url.pathname.slice('/og'.length) + url.search, env.SITE_ORIGIN)
            return devCors(await renderImage(env, target, ctx), request)
        }

        const embed = describe(url)

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
