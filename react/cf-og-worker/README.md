# The embed Worker

A Cloudflare Worker that gives Urban Stats pages per-URL link embeds. Every article shares one
static `article.html` with one fixed `og:image`, so a crawler asking for `?longname=Chicago` gets
the generic preview. This sits in front of `article.html`, `comparison.html` and `statistic.html`,
rewrites their `og:` meta tags per query string, and serves `/og/article.html?...` as a PNG card
drawn at the edge from the site's own static data files.

It bundles the site's own page-loading code, so it has to be redeployed whenever the site is built.

# Previewing locally

From `react/`, with the site's dev server already running:

```
npm run og-preview
```

That serves the Worker on port 8787 (`OG_PORT`) against `http://localhost:$PORT`
(`SITE_ORIGIN`). Everything not an embed page is proxied through to the site, so the Worker's
own port serves the whole site.

`/embed-preview.html?target=<page url>` is a dev page showing the site on one side and the card a
crawler would get on the other. It follows the frame's navigation, and it redraws when you edit the
Worker, which restarts it — the site's own hot reload knows nothing about that.

A card URL served against a local site takes `__tiles=<origin>`, which draws the basemap from that
origin rather than openfreemap. The card screenshot tests point it at a snapshot of the tiles.

# Deploying

[`site_workflows/deploy-cf-og-worker.yml`](../../site_workflows/deploy-cf-og-worker.yml)
is copied into the site repository by
[`urbanstats/website_data/build.py`](../../urbanstats/website_data/build.py) along with the rest of
the site, and runs *there*, on that repo's `page_build` event. It checks out urbanstats `main` and
deploys the Worker from it, on the assumption that whatever built the site is on `main` by then.

It needs three secrets on the site repository: `URBANSTATS_TOKEN` to check out this repo, and
`CLOUDFLARE_API_TOKEN` plus `CLOUDFLARE_ACCOUNT_ID` for an account holding the `urbanstats.org`
zone. The routes in [`wrangler.toml`](wrangler.toml) attach the Worker to that zone.

# Costs

`loadPageDescriptor` can load any page kind, so bundling it pulls in every panel. `wrangler.toml`
stubs out the ones the Worker never loads, which is most of the bundle. Drawing a PNG per request
also costs more CPU than a Worker usually does, and none of it is visible in the page that comes
out. [`embed_worker_resources.test.ts`](../test/embed_worker_resources.test.ts) holds bundle size,
startup CPU, render CPU and subrequests to bounds well above today's values, and logs the
measurements.
