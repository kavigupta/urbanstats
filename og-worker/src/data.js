/*
 * Everything an embed needs, read through the site's own routing and loading code.
 *
 * `pageDescriptorFromURL` and `loadPageDescriptor` are what the site's router calls on a real
 * navigation, so parsing, symlink resolution, universe defaulting, `?s` application and row
 * assembly are all the page's own -- an embed cannot drift from what it describes. Only the origin
 * handling is ours: those modules fetch root-relative paths, which a Worker has no base URL for.
 */
import { loadFeatureFromConsolidatedShard } from '../../react/src/load_json.ts'
import { shapeLink } from '../../react/src/navigation/links.ts'
import { loadPageDescriptor, pageDescriptorFromURL, pageTitle } from '../../react/src/navigation/PageDescriptor.ts'
import { Settings } from '../../react/src/page_template/settings.ts'
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
 * Runs the navigation the crawler's URL describes, stopping short of rendering a panel.
 *
 * Settings are per-call rather than `Settings.shared` because `?s` mutates them: a shared instance
 * would leak one link's stat selection into the next request's embed.
 */
export async function loadPage(origin, url) {
    useOrigin(origin)
    let descriptor
    try {
        descriptor = pageDescriptorFromURL(url)
    }
    catch {
        return undefined
    }
    const settings = new Settings()
    const { pageData, effects } = await loadPageDescriptor(descriptor, settings)
    // No await between here and reading the settings back: the isolate is single-threaded, so that
    // is what keeps a concurrent request from seeing this one's staged settings.
    effects()
    return { pageData, settings, title: pageTitle(pageData) }
}

export function articleCard({ pageData, settings }) {
    const stats = pageData.rows(settings.getMultiple(groupYearKeys()))[0]
        .filter(row => row.statval !== undefined && row.statname !== undefined)
        .slice(0, maxRows)
        .map(row => ({
            name: row.statname,
            value: row.statval,
            ordinal: row.ordinal,
            percentile: row.percentileByPopulation,
        }))
    const { shortname, longname, articleType } = pageData.article
    // Unit preferences reach the value renderer separately from the rows, and `?s` carries them.
    const units = settings.getMultiple(['use_imperial', 'temperature_unit'])
    return { shortname, longname, articleType, stats, units }
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
