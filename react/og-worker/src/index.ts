/*
 * Gives Urban Stats pages per-URL link embeds.
 *
 * Every article shares one static article.html with one fixed og:image, so a crawler asking for
 * ?longname=Chicago gets the generic preview. This rewrites the meta tags per query string on the
 * way through, and renders the image here at the edge -- reading the same static data files the
 * site does, so no browser is involved.
 */
// Must come first: it installs the browser globals the site's modules touch as they evaluate.
// eslint-disable-next-line import/no-unassigned-import -- Installing those globals is the point.
import './browser-shim'

import { Resvg, initWasm } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import satori from 'satori'

import { pageDescriptorFromURL } from '../../src/navigation/PageDescriptor'
import jostRegular from '../assets/Jost-400.ttf'
import jostSemiBold from '../assets/Jost-600.ttf'

import { articleCard, loadPage, loadShape } from './data'
import { embedCard } from './embed'

interface Embed {
    title: string
    description: string
    image?: string
}

/**
 * Everything the tags say, read off the URL alone. Loading the page would give nicer titles -- an
 * article's shortname rather than its longname -- but it means fetching the article's data on every
 * HTML request, real browsers included, for something only a crawler reads. The image render is the
 * one place that has to pay it.
 */
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
                title: descriptor.longname,
                description: `Statistics for ${descriptor.longname} on Urban Stats.`,
                // Only articles have a renderer. The rest still get a rewritten title and
                // description, which is most of the value, and keep the static preview image.
                image: new URL(`/og${url.pathname}${url.search}`, url.origin).toString(),
            }
        case 'comparison':
            return {
                title: descriptor.longnames.join(' vs '),
                description: `Comparing ${descriptor.longnames.join(', ')} on Urban Stats.`,
            }
        case 'statistic': {
            const title = 'statname' in descriptor ? descriptor.statname : 'Urban Stats: Custom Table'
            return { title, description: `${title} rankings on Urban Stats.` }
        }
        default:
            // 'syau' is left out deliberately: it has no per-URL identity, and its existing static
            // preview is already the right one.
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
                // Left alone for pages we can describe but not yet draw, so they keep the static
                // preview rather than pointing at an image that does not render.
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

let resvgReady: Promise<void> | undefined

let reloadEpoch: string | undefined

function servingLocalSite(env: WorkerEnv): boolean {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(env.SITE_ORIGIN)
}

/**
 * An id a dev reload leaves behind: wrangler reloads by starting a fresh isolate, so module state
 * that outlives one request but not one reload is exactly the right lifetime.
 */
function isolateID(): string {
    // Not at module scope: Workers disallow generating randomness while the global scope evaluates.
    reloadEpoch ??= crypto.randomUUID()
    return reloadEpoch
}

/**
 * Otherwise the first render of a URL is what you keep seeing for a day, however much the card's
 * code changes underneath it. Deployed renders keep the plain key: up there a new isolate means
 * nothing more than the last one going idle.
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

    const longname = target.searchParams.get('longname')
    if (longname === null) {
        return new Response('no longname', { status: 400 })
    }

    const [page, rings] = await Promise.all([
        loadPage(env.SITE_ORIGIN, target).catch(() => undefined),
        loadShape(env.SITE_ORIGIN, longname).catch(() => []),
    ])
    if (page?.pageData.kind !== 'article') {
        return new Response('no such article', { status: 404 })
    }

    const size = { width: 1200, height: 630 }
    const card = await embedCard(articleCard(page.pageData, page.settings), rings, size)
    const svg = await satori(card, {
        ...size,
        fonts: [
            { name: 'Jost', data: jostRegular, weight: 400, style: 'normal' },
            { name: 'Jost', data: jostSemiBold, weight: 600, style: 'normal' },
        ],
    })

    resvgReady ??= initWasm(resvgWasm)
    await resvgReady
    const png = new Resvg(svg, {
        fitTo: { mode: 'width', value: size.width },
        // Satori turns the card's own text into paths, but the basemap's place names reach resvg as
        // <text> inside the map image, and it has no system fonts to set them in.
        font: { fontBuffers: [new Uint8Array(jostRegular)], defaultFontFamily: 'Jost' },
    }).render().asPng()

    const response = new Response(png, {
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' },
    })
    ctx.waitUntil(cache.put(key, response.clone()))
    return response
}

/*
 * Lets the site's embed-preview dev panel read what a crawler would see.
 *
 * Scoped to localhost callers: the panel is served by the local site on one port and talks to this
 * Worker on another, so without it the preview cannot read back its own rewritten tags. Nothing
 * deployed is ever a localhost origin, so this stays inert in production.
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

        // Wrangler watches this Worker's own sources, which the site's dev server knows nothing
        // about, so the preview panel polls here to see the card's code reload.
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
