/*
 * Gives Urban Stats pages per-URL link embeds.
 *
 * Every article shares one static article.html with one fixed og:image, so a crawler asking for
 * ?longname=Chicago gets the generic preview. This rewrites the meta tags per query string on the
 * way through, and renders the image here at the edge -- reading the same static data files the
 * site does, so no browser is involved.
 */
// Must come first: it installs the browser globals the site's modules touch as they evaluate.
import './browser-shim.js'

import { Resvg, initWasm } from '@resvg/resvg-wasm'
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm'
import satori from 'satori'

import jostRegular from '../assets/Jost-400.ttf'
import jostSemiBold from '../assets/Jost-600.ttf'

import { articleCard, loadPage, loadShape } from './data.js'
import { embedCard } from './embed.js'

// The page kinds worth describing. 'syau' is left out deliberately: it has no per-URL identity, and
// its existing static preview is already the right one.
const embeddable = new Set(['article', 'comparison', 'statistic'])

/**
 * The site has titles but no notion of a description, so this is the one piece of embed text we
 * write ourselves. Titles come from `pageTitle`, the same function that sets document.title.
 */
function describe(pageData, title) {
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

class RewriteMeta {
    constructor(embed) {
        this.embed = embed
    }

    element(element) {
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

class RewriteTitle {
    constructor(embed) {
        this.embed = embed
    }

    element(element) {
        element.setInnerContent(this.embed.title)
    }
}

let resvgReady

async function renderImage(env, target, ctx) {
    const cache = caches.default
    const key = new Request(target.toString(), { method: 'GET' })
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
    const svg = await satori(embedCard(articleCard(page), rings ?? [], size), {
        ...size,
        fonts: [
            { name: 'Jost', data: jostRegular, weight: 400, style: 'normal' },
            { name: 'Jost', data: jostSemiBold, weight: 600, style: 'normal' },
        ],
    })

    resvgReady ??= initWasm(resvgWasm)
    await resvgReady
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: size.width } }).render().asPng()

    const response = new Response(png, {
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400' },
    })
    ctx.waitUntil(cache.put(key, response.clone()))
    return response
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url)

        if (url.pathname.startsWith('/og/')) {
            const target = new URL(url.pathname.slice('/og'.length) + url.search, env.SITE_ORIGIN)
            return renderImage(env, target, ctx)
        }

        const origin = await fetch(new URL(url.pathname + url.search, env.SITE_ORIGIN).toString(), request)
        if (!(origin.headers.get('content-type') ?? '').includes('text/html')) {
            return origin
        }

        const page = await loadPage(env.SITE_ORIGIN, url).catch(() => undefined)
        if (page === undefined || !embeddable.has(page.pageData.kind)) {
            return origin
        }

        const embed = { title: page.title, description: describe(page.pageData, page.title) }

        // Only articles have a renderer. The rest still get a rewritten title and description, which
        // is most of the value, and keep the static preview image.
        if (page.pageData.kind === 'article') {
            embed.image = new URL(`/og${url.pathname}${url.search}`, url.origin).toString()
            // Start the render now rather than when the crawler asks for the image, buying it
            // roughly one round trip of head start.
            ctx.waitUntil(fetch(embed.image).catch(() => {}))
        }

        return new HTMLRewriter()
            .on('meta', new RewriteMeta(embed))
            .on('title', new RewriteTitle(embed))
            .transform(origin)
    },
}
