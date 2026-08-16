/*
 * Everything an embed needs, read through the site's own routing and loading code, so an embed
 * cannot drift from the page it describes. Only the origin handling is ours: those modules fetch
 * root-relative paths, which a Worker has no base URL for.
 */
import { loadFeatureFromConsolidatedShard } from '../../src/load_json'
import { loadPageDescriptor, PageData, PageDescriptor } from '../../src/navigation/PageDescriptor'
import { shapeLink, universePath } from '../../src/navigation/links'
import { Settings, SettingsDictionary } from '../../src/page_template/settings'
import { groupYearKeys } from '../../src/page_template/statistic-settings'
import { StatName } from '../../src/page_template/statistic-tree'
import { sanitize } from '../../src/utils/paths'

import { Ring } from './map-layout'

let siteOrigin: string | undefined

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
 * Runs the navigation the descriptor describes, stopping short of rendering a panel. Settings are
 * per-call rather than `Settings.shared` because `?s` mutates them, and one link's stat selection
 * must not leak into the next request's embed.
 */
export async function loadPage(origin: string, descriptor: PageDescriptor): Promise<Page> {
    setOrigin(origin)
    const settings = new Settings()
    const { pageData, effects } = await loadPageDescriptor(descriptor, settings)
    effects()
    return { pageData, settings }
}

export type Units = Pick<SettingsDictionary, 'use_imperial' | 'temperature_unit'>

export interface ArticleCard {
    shortname: string
    longname: string
    articleType: string
    universe: string
    /** The flag as a data URI, or undefined if it could not be read. */
    flag: string | undefined
    stats: { name: StatName, value: number, ordinal: number, percentile: number }[]
    units: Units
}

/** Inlined because satori would fetch the source with no origin to resolve it against. */
async function flagImage(universe: string): Promise<string | undefined> {
    const response = await fetch(universePath(universe)).catch(() => undefined)
    if (response?.ok !== true) {
        return undefined
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    let binary = ''
    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }
    return `data:image/png;base64,${btoa(binary)}`
}

export async function articleCard(pageData: Extract<PageData, { kind: 'article' }>, settings: Settings): Promise<ArticleCard> {
    const stats = pageData.rows(settings.getMultiple(groupYearKeys()))[0]
        // Metadata rows carry a representative or a string where a statistic row carries a number.
        .filter(row => row.kind === 'statistic')
        .slice(0, maxRows)
        .map(row => ({
            name: row.statname,
            value: row.statval,
            ordinal: row.ordinal,
            percentile: row.percentileByPopulation,
        }))
    const { shortname, longname, articleType } = pageData.article
    // The value renderer takes these separately from the rows, and `?s` carries them.
    const units = settings.getMultiple(['use_imperial', 'temperature_unit'])
    const universe = pageData.universe
    return { shortname, longname, articleType, universe, flag: await flagImage(universe), stats, units }
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
