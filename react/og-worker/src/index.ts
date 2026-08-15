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

import { PageData } from '../../src/navigation/PageDescriptor'
import jostRegular from '../assets/Jost-400.ttf'
import jostSemiBold from '../assets/Jost-600.ttf'

import { articleCard, loadPage, loadShape } from './data'
import { embedCard } from './embed'

// The page kinds worth describing. 'syau' is left out deliberately: it has no per-URL identity, and
// its existing static preview is already the right one.
const embeddable = new Set<PageData['kind']>(['article', 'comparison', 'statistic'])

interface Embed {
    title: string
    description?: string
    image?: string
}

/**
 * The site has titles but no notion of a description, so this is the one piece of embed text we
 * write ourselves. Titles come from `pageTitle`, the same function that sets document.title.
 */
function describe(pageData: PageData, title: string): string | undefined {
    switch (pageData.kind) {
        case 'article':
            return `Statistics for ${pageData.article.longname} on Urban Stats.`
        case 'comparison':
            return `Comparing ${pageData.articles.map(article => article.longname).join(', ')} on Urban Stats.`
        case 'statistic':
            return `${title} rankings on Urban Stats.`
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
                if (this.embed.description !== undefined) {
                    element.setAttribute('content', this.embed.description)
                }
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

/**
 * A cache key that a dev reload leaves behind.
 *
 * Otherwise the first render of a URL is what you keep seeing for a day, however much the card's
 * code changes underneath it. Wrangler reloads by starting a fresh isolate, so module state that
 * outlives one request but not one reload is exactly the right lifetime. Deployed renders keep the
 * plain key: up there a new isolate means nothing more than the last one going idle.
 */
function cacheKey(env: WorkerEnv, target: URL): Request {
    if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(env.SITE_ORIGIN)) {
        return new Request(target.toString(), { method: 'GET' })
    }
    // Not at module scope: Workers disallow generating randomness while the global scope evaluates.
    reloadEpoch ??= crypto.randomUUID()
    const key = new URL(target)
    key.searchParams.set('__reload', reloadEpoch)
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

        if (url.pathname.startsWith('/og/')) {
            const target = new URL(url.pathname.slice('/og'.length) + url.search, env.SITE_ORIGIN)
            return devCors(await renderImage(env, target, ctx), request)
        }

        const origin = await fetch(new URL(url.pathname + url.search, env.SITE_ORIGIN).toString(), request)
        if (!(origin.headers.get('content-type') ?? '').includes('text/html')) {
            return origin
        }

        const page = await loadPage(env.SITE_ORIGIN, url).catch(() => undefined)
        if (page === undefined || !embeddable.has(page.pageData.kind)) {
            return devCors(origin, request)
        }

        const embed: Embed = { title: page.title, description: describe(page.pageData, page.title) }

        // Only articles have a renderer. The rest still get a rewritten title and description, which
        // is most of the value, and keep the static preview image.
        if (page.pageData.kind === 'article') {
            embed.image = new URL(`/og${url.pathname}${url.search}`, url.origin).toString()
            // Start the render now rather than when the crawler asks for the image, buying it
            // roughly one round trip of head start.
            ctx.waitUntil(fetch(embed.image).catch(() => undefined))
        }

        const rewritten = new HTMLRewriter()
            .on('meta', new RewriteMeta(embed))
            .on('title', new RewriteTitle(embed))
            .transform(origin)
        return devCors(rewritten, request)
    },
}
