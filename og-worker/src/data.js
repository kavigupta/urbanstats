/*
 * Everything an embed needs, read straight off the site's static data files.
 *
 * The lookup logic is the site's own -- `dataLink`/`shapeLink` do the shard hashing, `loadProtobuf`
 * does the fetch and decode -- so an embed cannot drift from the page it describes. Only the origin
 * handling is ours: those modules fetch root-relative paths, which a Worker has no base URL for.
 */
import { loadArticleFromConsolidatedShard, loadFeatureFromConsolidatedShard } from '../../react/src/load_json.ts'
import { dataLink, shapeLink } from '../../react/src/navigation/links.ts'
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

/*
 * Copied rather than imported: it lives in load-article.ts, whose import graph reaches the app's
 * settings and UI, and from there to katex and the webfonts. Everything else here comes from the
 * site's own modules.
 */
function unpackBytes(bytes) {
    const result = []
    for (let i = 0; i < bytes.length; i++) {
        for (let j = 0; j < 8; j++) {
            if (bytes[i] & (1 << j)) {
                result.push(i * 8 + j)
            }
        }
    }
    return result
}

/** The stats the embed shows, in the order it shows them. */
const shown = ['Population', 'PW Density (r=1km)', 'AW Density', 'Area', 'Compactness']

export async function loadArticle(origin, longname, universe) {
    useOrigin(origin)
    const sanitized = sanitize(longname)
    // Resolves symlinked names too, which is why this is worth importing rather than reproducing.
    const article = await loadArticleFromConsolidatedShard(await dataLink(sanitized), sanitized)
    if (article === undefined || article === null) {
        return undefined
    }

    const statIndices = unpackBytes(article.statisticIndicesPacked)
    // Falls back to the first universe, which is the broadest one the article belongs to.
    const universeIdx = Math.max(0, article.universes.indexOf(universe ?? article.universes[0]))

    const { default: statNames } = await import('../../react/src/data/statistic_name_list.ts')
    const stats = shown.flatMap((name) => {
        const row = statIndices.indexOf(statNames.indexOf(name))
        if (row < 0) {
            return []
        }
        const { statval, ordinalByUniverse, percentileByPopulationByUniverse } = article.rows[row]
        return [{
            name,
            value: statval,
            ordinal: ordinalByUniverse[universeIdx],
            percentile: percentileByPopulationByUniverse[universeIdx],
        }]
    })

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
