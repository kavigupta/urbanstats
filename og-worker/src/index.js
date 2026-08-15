/*
 * Gives Urban Stats pages per-URL link embeds.
 *
 * Every article shares one static article.html with one fixed og:image, so a crawler asking for
 * ?longname=Chicago gets the generic preview. This rewrites the meta tags per query string on the
 * way through, and points og:image at a renderer that screenshots the page itself.
 */

// syau.html is left out deliberately: it has no per-URL identity to describe, and its existing
// static preview is already the right one.
const embeddable = new Set(['/article.html', '/comparison.html', '/statistic.html'])

// A crawler gives up long before a cold render finishes, so a miss serves the static preview and
// leaves the render running to fill the cache for whoever shares the link next.
const renderBudgetMs = 2500

function describe(pathname, params) {
    switch (pathname) {
        case '/article.html': {
            const longname = params.get('longname')
            return longname === null
                ? undefined
                : { title: longname, description: `Statistics for ${longname} on Urban Stats.` }
        }
        case '/comparison.html': {
            let longnames
            try {
                longnames = JSON.parse(params.get('longnames') ?? '')
            }
            catch {
                return undefined
            }
            return Array.isArray(longnames) && longnames.length > 0
                ? { title: longnames.join(' vs '), description: `Comparing ${longnames.join(', ')} on Urban Stats.` }
                : undefined
        }
        case '/statistic.html': {
            const statname = params.get('statname')?.replaceAll('__PCT__', '%')
            return statname === undefined
                ? undefined
                : { title: statname, description: `${statname} rankings on Urban Stats.` }
        }
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
                element.setAttribute('content', this.embed.image)
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

async function renderImage(env, target, ctx) {
    const cache = caches.default
    const key = new Request(target.toString(), { method: 'GET' })
    const cached = await cache.match(key)
    if (cached !== undefined) {
        return cached
    }

    const upstream = new URL(`/render${target.pathname}${target.search}`, env.RENDER_ORIGIN)
    const render = fetch(upstream.toString()).then(async (response) => {
        if (!response.ok) {
            return response
        }
        const stored = new Response(response.body, response)
        stored.headers.set('cache-control', 'public, max-age=86400')
        ctx.waitUntil(cache.put(key, stored.clone()))
        return stored
    })

    const timeout = new Promise(resolve => setTimeout(() => { resolve(undefined) }, renderBudgetMs))
    const raced = await Promise.race([render.catch(() => undefined), timeout])
    if (raced !== undefined && raced.ok) {
        return raced
    }

    // Keep the render going even though this request is giving up on it.
    ctx.waitUntil(render.catch(() => {}))
    return fetch(new URL('/link-preview.png', env.SITE_ORIGIN).toString())
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url)

        if (url.pathname.startsWith('/og/')) {
            const target = new URL(url.pathname.slice('/og'.length) + url.search, env.SITE_ORIGIN)
            if (!embeddable.has(target.pathname)) {
                return new Response('not embeddable', { status: 404 })
            }
            return renderImage(env, target, ctx)
        }

        const origin = await fetch(new URL(url.pathname + url.search, env.SITE_ORIGIN).toString(), request)

        const embed = embeddable.has(url.pathname) ? describe(url.pathname, url.searchParams) : undefined
        if (embed === undefined || !(origin.headers.get('content-type') ?? '').includes('text/html')) {
            return origin
        }

        embed.image = new URL(`/og${url.pathname}${url.search}`, url.origin).toString()
        // Start the render now rather than when the crawler asks for the image, buying it roughly
        // one round trip of head start.
        ctx.waitUntil(fetch(embed.image).catch(() => {}))

        return new HTMLRewriter()
            .on('meta', new RewriteMeta(embed))
            .on('title', new RewriteTitle(embed))
            .transform(origin)
    },
}
