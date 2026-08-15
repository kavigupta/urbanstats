/*
 * Everything an embed needs, read through the site's own routing and loading code.
 *
 * `pageDescriptorFromURL` and `loadPageDescriptor` are what the site's router calls on a real
 * navigation, so parsing, symlink resolution, universe defaulting, `?s` application and row
 * assembly are all the page's own -- an embed cannot drift from what it describes. Only the origin
 * handling is ours: those modules fetch root-relative paths, which a Worker has no base URL for.
 */
import { loadFeatureFromConsolidatedShard } from '../../src/load_json'
import { loadPageDescriptor, PageData, pageDescriptorFromURL } from '../../src/navigation/PageDescriptor'
import { shapeLink } from '../../src/navigation/links'
import { Settings, SettingsDictionary } from '../../src/page_template/settings'
import { groupYearKeys } from '../../src/page_template/statistic-settings'
import { StatName } from '../../src/page_template/statistic-tree'
import { sanitize } from '../../src/utils/paths'

import { Ring } from './map-layout'

let siteOrigin: string | undefined

/**
 * Resolves the root-relative paths the site's data code asks for. It runs in a browser, where those
 * resolve against the page; here there is nothing to resolve against until we say so.
 */
const originalFetch = globalThis.fetch
globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (typeof input === 'string' && input.startsWith('/') && siteOrigin !== undefined) {
        return originalFetch(new URL(input, siteOrigin), init)
    }
    return originalFetch(input, init)
}

function setOrigin(origin: string): void {
    siteOrigin = origin
}

/** How many rows fit the card before it overflows. */
const maxRows = 6

export interface Page {
    pageData: PageData
    settings: Settings
}

/**
 * Runs the navigation the crawler's URL describes, stopping short of rendering a panel.
 *
 * Settings are per-call rather than `Settings.shared` because `?s` mutates them: a shared instance
 * would leak one link's stat selection into the next request's embed.
 */
export async function loadPage(origin: string, url: URL): Promise<Page | undefined> {
    setOrigin(origin)
    let descriptor
    try {
        descriptor = pageDescriptorFromURL(url)
    }
    catch {
        return undefined
    }
    // The site's constructor is private because it wants one shared instance; a request wants the
    // opposite, for the reason above.
    const settings = new (Settings as unknown as new () => Settings)()
    const { pageData, effects } = await loadPageDescriptor(descriptor, settings)
    // No await between here and reading the settings back: the isolate is single-threaded, so that
    // is what keeps a concurrent request from seeing this one's staged settings.
    effects()
    return { pageData, settings }
}

export type Units = Pick<SettingsDictionary, 'use_imperial' | 'temperature_unit'>

export interface ArticleCard {
    shortname: string
    longname: string
    articleType: string
    stats: { name: StatName, value: number, ordinal: number, percentile: number }[]
    units: Units
}

export function articleCard(pageData: Extract<PageData, { kind: 'article' }>, settings: Settings): ArticleCard {
    const stats = pageData.rows(settings.getMultiple(groupYearKeys()))[0]
        // Metadata rows carry a representative or a string where a statistic row carries a number,
        // and the card has nothing to do with either.
        .filter(row => row.kind === 'statistic')
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

export async function loadShape(origin: string, longname: string): Promise<Ring[]> {
    setOrigin(origin)
    const sanitized = sanitize(longname)
    const feature = await loadFeatureFromConsolidatedShard(await shapeLink(sanitized), sanitized)
    if (feature === undefined) {
        return []
    }
    const polygons = feature.polygon ? [feature.polygon] : (feature.multipolygon?.polygons ?? [])
    return polygons.flatMap(polygon => polygon.rings!.map(
        ring => ring.coords!.map((coord): [number, number] => [coord.lon!, coord.lat!]),
    ))
}
