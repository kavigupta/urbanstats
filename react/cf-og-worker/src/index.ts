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

import { PageDescriptor, pageDescriptorFromURL } from '../../src/navigation/PageDescriptor'

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
 * Deployed, the key is what the card is drawn from rather than the URL it was asked for: the page's
 * schemas drop parameters they do not know, so keying on the raw URL would let a crawler appending
 * `&x=1`, `&x=2`, ... force a fresh render for every request.
 *
 * Locally the raw URL stands instead, carrying the isolate's ID: the parameters that steer and
 * repeat a dev render live there, and an edit to the card's code starts a fresh isolate rather than
 * being hidden behind a day-old render.
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
 * A local render may be pointed at a snapshot of the tiles, which is how a card screenshot stays
 * put when openfreemap rebuilds the planet. Deployed, the parameter is ignored, and has to be:
 * whoever chooses the tile origin chooses what the basemap shows, and this card goes out under
 * urbanstats.org's own name.
 */
function tileOrigin(env: WorkerEnv, target: URL): string {
    const snapshot = target.searchParams.get('__tiles')
    return servingLocalSite(env) && snapshot !== null ? snapshot : openfreemap
}

/*
 * A crawler that gets anything but an image here shows no preview at all, so a failed render
 * answers with the site's generic one instead. Kept out of the cache, and cacheable downstream for
 * minutes rather than the card's day, so a passing failure is not what the next crawler sees.
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
    if (descriptor.kind !== 'article') {
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

        // Lets the preview panel see the card's code reload, which the site's own dev server knows
        // nothing about. Held open rather than polled, so an idle panel costs one request log line
        // per Worker restart instead of one per second.
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

        const embed = describe(url)

        /*
         * SITE_ORIGIN is the host this Worker is installed on, and asking it for the very page we
         * were called for is not a loop: Cloudflare sends a Worker's subrequest that matches one of
         * its own routes to the origin server rather than invoking the Worker again.
         */
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
