/*
 * Everything an embed needs, read straight off the site's static data files.
 *
 * The lookup logic is the site's own -- `dataLink`/`shapeLink` do the shard hashing, `loadProtobuf`
 * does the fetch and decode -- so an embed cannot drift from the page it describes. Only the origin
 * handling is ours: those modules fetch root-relative paths, which a Worker has no base URL for.
 */
import { getCountsByArticleType } from '../../react/src/components/countsByArticleType.ts'
import { loadArticles } from '../../react/src/components/load-article.ts'
import { loadArticleFromConsolidatedShard, loadFeatureFromConsolidatedShard } from '../../react/src/load_json.ts'
import { dataLink, shapeLink } from '../../react/src/navigation/links.ts'
import { Settings } from '../../react/src/page_template/settings.ts'
import { fromVector } from '../../react/src/page_template/settings-vector.ts'
import { groupYearKeys } from '../../react/src/page_template/statistic-settings.ts'
import { sanitize } from '../../react/src/utils/paths.ts'

let siteOrigin

/**
 * Resolves the root-relative paths the site's data code asks for. It runs in a browser, where those
 * resolve against the page; here there is nothing to resolve against until we say so.
 */
const originalFetch = globalThis.fetch
globalThis.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith('/') && siteOrigin !== undefined) {
        return originalFetch(new URL(input, siteOrigin), init)
    }
    return originalFetch(input, init)
}

export function useOrigin(origin) {
    siteOrigin = origin
}

/** How many rows fit the card before it overflows. */
const maxRows = 5

/**
 * The stat selection the link carries. `?s` is the settings vector the site puts on shared links,
 * so decoding it here is what makes an embed show the same rows the sharer was looking at rather
 * than the defaults.
 */
function statSettings(vector) {
    const settings = Settings.shared
    const fromLink = vector === undefined ? undefined : fromVector(vector, settings)
    return Object.fromEntries(groupYearKeys().map(key => [key, fromLink?.[key] ?? settings.get(key)]))
}

export async function loadArticle(origin, longname, universe, vector) {
    useOrigin(origin)
    const sanitized = sanitize(longname)
    // Resolves symlinked names too, which is why this is worth importing rather than reproducing.
    const article = await loadArticleFromConsolidatedShard(await dataLink(sanitized), sanitized)
    if (article === undefined || article === null) {
        return undefined
    }

    // Falls back to the first universe, which is the broadest one the article belongs to.
    const chosenUniverse = article.universes.includes(universe) ? universe : article.universes[0]

    // The page's own row assembly, so the embed shows the rows the article page would.
    const { rows } = await loadArticles([article], await getCountsByArticleType(), chosenUniverse)
    const stats = rows(statSettings(vector))[0]
        .filter(row => row.statval !== undefined && row.statname !== undefined)
        .slice(0, maxRows)
        .map(row => ({
            name: row.statname,
            value: row.statval,
            ordinal: row.ordinal,
            percentile: row.percentileByPopulation,
        }))

    return { shortname: article.shortname, longname, articleType: article.articleType, stats }
}

export async function loadShape(origin, longname) {
    useOrigin(origin)
    const sanitized = sanitize(longname)
    const feature = await loadFeatureFromConsolidatedShard(await shapeLink(sanitized), sanitized)
    if (feature === undefined || feature === null) {
        return []
    }
    const polygons = feature.polygon ? [feature.polygon] : (feature.multipolygon?.polygons ?? [])
    return polygons.flatMap(polygon => polygon.rings.map(ring => ring.coords))
}
