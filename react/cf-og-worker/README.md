# The embed Worker

A Cloudflare Worker that gives Urban Stats pages per-URL link embeds. Every article shares one
static `article.html` with one fixed `og:image`, so a crawler asking for `?longname=Chicago` gets
the generic preview. This sits in front of `article.html`, `comparison.html`, `statistic.html` and
`mapper.html`, rewrites their `og:` meta tags per query string, and serves each of them under
`/og/` as a PNG card drawn at the edge from the site's own static data files.

A map's title comes out of its script by static analysis rather than by running it — see
`describeMap` in [`index.ts`](src/index.ts) — because the tags are rewritten on every request,
browsers included, while running a map's script means loading a geography's worth of statistics.
Only the card runs it. A card does not draw a map's text boxes. A custom table's title comes out of
its own script the same way, through `tableLabel`.

A statistic's card runs the page's own table script through the interpreter directly, since the
page runs it in a web worker, which a Worker has no equivalent of. It draws the rows of the page
the link asks for, in the order that page sorts them, numbered by the ordinal its cells carry. A
table of one column is titled the way the page titles it, with the geographies it ranks and the
condition it filters them by below the title; a table of several is titled by its own column
headers instead, and heads its names with those geographies and that condition.

A comparison's card keeps its map only while the regions are close enough together for one to show
them, by the fill `partitionLongnames` decides that on; otherwise the table takes the whole card.
Satori measures no text before it lays out, so how wide a column is and how many rows fit are worked
out by hand in `embed.tsx`.

A card draws a cluster map's markers through the same supercluster the page's maplibre source runs,
configured the way maplibre configures it, so the grouping is the one a reader of the page sees. See
[`clusters.ts`](src/clusters.ts).

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
crawler would get on the other. It follows the frame's navigation, writing it back into `target` so
a reload stays where you were, and it redraws when you edit the Worker, which restarts it — the
site's own hot reload knows nothing about that.

A card URL served against a local site takes `__tiles=<origin>`, which draws the basemap from that
origin rather than openfreemap. The card screenshot tests point it at a snapshot of the tiles.

# Deploying

[`site_workflows/deploy-cf-og-worker.yml`](../../site_workflows/deploy-cf-og-worker.yml)
is copied into the site repository by
[`urbanstats/website_data/build.py`](../../urbanstats/website_data/build.py) along with the rest of
the site, and runs *there*, on that repo's `page_build` event. `build.py` substitutes the urbanstats
commit it is building from into the workflow's `ref`, so the Worker is deployed from the same code
as the site it fronts. Building the site from a commit that is not pushed to urbanstats fails that
checkout rather than deploying a mismatched Worker.

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
