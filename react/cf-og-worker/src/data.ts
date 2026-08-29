/*
 * Everything an embed needs, read through the site's own routing and loading code, so an embed
 * cannot drift from the page it describes. Only the origin handling is ours: those modules fetch
 * root-relative paths, which a Worker has no base URL for.
 */
import { ArticleStatisticRow, getHighlightIndex } from '../../src/components/load-article'
import { shapesByName } from '../../src/consolidated-shapes'
import validGeographies from '../../src/data/mapper/used_geographies'
import { defaultTypeEnvironment } from '../../src/mapper/context'
import { centroidsByName, markerArea, markerRadius, MapResult, mapVisuals } from '../../src/mapper/map-rendering'
import { Basemap, computeUSS } from '../../src/mapper/settings/utils'
import { loadPageDescriptor, PageData, PageDescriptor } from '../../src/navigation/PageDescriptor'
import { universePath } from '../../src/navigation/links'
import { Settings, SettingsDictionary } from '../../src/page_template/settings'
import { groupYearKeys } from '../../src/page_template/statistic-settings'
import { StatName } from '../../src/page_template/statistic-tree'
import { mapUSSFromStat, pageRowIndices, sortedRowIndices, statDataFromTable } from '../../src/stat/utils'
import { clusterRadius } from '../../src/syau/cluster-geometry'
import { Universe } from '../../src/universe'
import { toStatement } from '../../src/urban-stats-script/ast'
import { doRender } from '../../src/urban-stats-script/constants/color-utils'
import { Inset } from '../../src/urban-stats-script/constants/insets'
import { ClusterMap, CMap, CMapRGB, PMap } from '../../src/urban-stats-script/constants/map'
import { Table } from '../../src/urban-stats-script/constants/table'
import { deriveConditionLabel, deriveMapLabel } from '../../src/urban-stats-script/derive-human-readable-name'
import { createRequestExecutor } from '../../src/urban-stats-script/execute-request'
import { geometry } from '../../src/utils/geometry'
import { HumanReadableName } from '../../src/utils/human-readable-element'
import { reifyString } from '../../src/utils/human-readable-name'
import { Feature } from '../../src/utils/protos'
import { StoredUnit } from '../../src/utils/quantity'
import { loadFeatureFromPossibleSymlink } from '../../src/utils/symlinks'
import { displayType } from '../../src/utils/text'
import { NormalizeProto } from '../../src/utils/types'
import { unitTypeToStoredUnit } from '../../src/utils/unit'

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

/** The same, for a comparison, whose widest layout has no map to leave room for. */
const maxComparisonRows = 8

/** The same, for a statistic table, whose rows are one line each. */
const maxStatisticRows = 8

/** Past this a column is too narrow to read a value in. */
const maxStatisticColumns = 3

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

export interface ComparisonCard {
    regions: { shortname: string, longname: string }[]
    /** One per statistic, with a value per region and the index of the largest of them. */
    stats: { name: StatName, values: number[], highlight: number | undefined }[]
    units: Units
}

export function comparisonCard(pageData: Extract<PageData, { kind: 'comparison' }>, settings: Settings): ComparisonCard {
    const byRegion = pageData.rows(settings.getMultiple(groupYearKeys()))
    const stats = byRegion[0]
        .map((_, statIndex) => byRegion.map(rows => rows[statIndex]))
        // A statistic only some of the regions report as a number has nothing to compare.
        .flatMap(rows => rows.every((row): row is ArticleStatisticRow => row.kind === 'statistic') ? [rows] : [])
        // More than the card draws: how many fit depends on whether the layout keeps the map.
        .slice(0, maxComparisonRows)
        .map(rows => ({
            name: rows[0].statname,
            values: rows.map(row => row.statval),
            highlight: getHighlightIndex(rows),
        }))
    return {
        regions: pageData.articles.map(({ shortname, longname }) => ({ shortname, longname })),
        stats,
        units: settings.getMultiple(['use_imperial', 'temperature_unit']),
    }
}

export interface StatisticCard {
    /** The geographies ranked, as the page heads itself: "Cities", "Counties". */
    heading: string
    /** What is ranked, without the condition, which the card states beside the geographies. */
    title: HumanReadableName
    columns: { name: HumanReadableName, unit: StoredUnit | undefined }[]
    /** Which column the rows are in the order of, and which way, as the page's header marks it. */
    sortColumn: number
    order: 'ascending' | 'descending'
    /** The condition the script filters the geographies by, absent when it filters none. */
    filter: HumanReadableName | undefined
    /** One per row of the page, in the order the page sorts them. */
    rows: { longname: string, ordinal: number, values: number[] }[]
    universe: string
    /** The flag as a data URI, or undefined if it could not be read. */
    flag: string | undefined
    units: Units
}

/**
 * Runs the table the page would run, through the interpreter directly: the page's generator runs it
 * in a web worker, which a Worker has no equivalent of. Everything after that is the panel's own.
 */
export async function statisticCard(origin: string, pageData: Extract<PageData, { kind: 'statistic' }>, settings: Settings): Promise<StatisticCard | undefined> {
    setOrigin(origin)
    const { stat, view } = pageData.settings
    const typeEnvironment = defaultTypeEnvironment(stat.universe)
    const mapUSS = mapUSSFromStat(stat)
    // Its own executor: each card is a page of its own, so one kept across them would only hold
    // the previous page's columns in the isolate.
    const executed = await createRequestExecutor()({
        descriptor: {
            kind: 'statistics',
            geographyKind: stat.articleType as typeof validGeographies[number],
            universe: stat.universe,
        },
        stmts: toStatement(mapUSS),
    })
    const table = (executed.resultingValue?.value as { value: Table } | undefined)?.value
    if (table === undefined || table.columns.length === 0) {
        return undefined
    }

    const data = statDataFromTable({ table, stat, mapUSS, typeEnvironment, warn: () => undefined })
    const sortColumn = Math.max(0, Math.min(view.sortColumn, data.table.length - 1))
    // The rows carry the sorted column's rank, so that column takes the last of the few slots the
    // card has when the page sorts by one that would otherwise be cut off.
    const columns = sortColumn < maxStatisticColumns
        ? data.table.slice(0, maxStatisticColumns)
        : [...data.table.slice(0, maxStatisticColumns - 1), data.table[sortColumn]]
    const page = pageRowIndices(sortedRowIndices(data, sortColumn, view.order), view.start, view.amount)

    return {
        heading: displayType(stat.universe, stat.articleType),
        title: typeof data.renderedStatname === 'string'
            ? data.renderedStatname
            : data.renderedStatname.filter(element => element.type !== 'where'),
        columns: columns.map(column => ({ name: column.name, unit: column.unit })),
        sortColumn: Math.min(sortColumn, maxStatisticColumns - 1),
        order: view.order,
        filter: deriveConditionLabel(mapUSS, typeEnvironment),
        rows: page.slice(0, maxStatisticRows).map(index => ({
            longname: data.articleNames[index],
            // Only the sorted column's, the card having one number per row rather than one per cell.
            ordinal: data.table[sortColumn].ordinal[index],
            values: columns.map(column => column.value[index]),
        })),
        universe: stat.universe,
        flag: await flagImage(stat.universe),
        units: settings.getMultiple(['use_imperial', 'temperature_unit']),
    }
}

/**
 * What the map puts on the basemap: shapes filled per geography, or a circle at each geography's
 * centroid. Cluster maps keep their points apart because the card has to merge them by proximity,
 * which needs the category and size of each rather than a colour and a radius.
 */
export type MapContents =
    | { kind: 'shapes', shapes: { rings: Ring[], fill: string }[], outline: { color: string, weight: number } }
    | { kind: 'points', points: { lon: number, lat: number, fill: string, radius: number }[] }
    | {
        kind: 'clusters'
        points: { lon: number, lat: number, category: number, size: number }[]
        categoryColors: string[]
        maxRadius: number
        clusterRadius: number
    }

export interface MapCard {
    label: string
    contents: MapContents
    opacity: number
    insets: Inset[]
    basemap: Basemap
    /** The colourbar, absent on an RGB map, which has no single scale to show. */
    ramp?: { colors: string[], ticks: number[], unit: StoredUnit | undefined }
    units: Units
}

/** A multipolygon's islands and holes flatten together: the card fills them under one even-odd rule. */
function rings(shape: GeoJSON.Geometry): Ring[] {
    const polygons = shape.type === 'MultiPolygon'
        ? shape.coordinates
        : shape.type === 'Polygon' ? [shape.coordinates] : []
    return polygons.flatMap(polygon => polygon.map(ring => ring.map(([lon, lat]): [number, number] => [lon, lat])))
}

async function shapeContents(geographyKind: string, universe: Universe, map: CMap | CMapRGB, fills: string[]): Promise<MapContents> {
    const shapes = await shapesByName(universe, geographyKind)
    return {
        kind: 'shapes',
        shapes: map.geo.flatMap((name, i) => {
            const shape = shapes.get(name)
            return shape === undefined ? [] : [{ rings: rings(shape), fill: fills[i] }]
        }),
        outline: { color: doRender(map.outline.color), weight: map.outline.weight },
    }
}

async function pointContents(geographyKind: string, universe: Universe, map: PMap, fills: string[]): Promise<MapContents> {
    const at = await centroidsByName(universe, geographyKind)
    return {
        kind: 'points',
        points: map.geo.flatMap((name, i) => {
            const centroid = at.get(name)
            return centroid === undefined
                ? []
                : [{ lon: centroid.lon!, lat: centroid.lat!, fill: fills[i], radius: markerRadius(map.relativeArea[i], map.maxRadius) }]
        }),
    }
}

/** Sizes are areas rather than radii, so that merging two points adds their areas the way the site's do. */
async function clusterContents(geographyKind: string, universe: Universe, map: ClusterMap, bins: number[], categoryColors: string[]): Promise<MapContents> {
    const at = await centroidsByName(universe, geographyKind)
    return {
        kind: 'clusters',
        points: map.geo.flatMap((name, i) => {
            const centroid = at.get(name)
            return centroid === undefined
                ? []
                : [{
                        lon: centroid.lon!,
                        lat: centroid.lat!,
                        category: bins[i],
                        size: markerArea(markerRadius(map.relativeArea[i], map.maxRadius)),
                    }]
        }),
        categoryColors,
        maxRadius: map.maxRadius,
        clusterRadius: clusterRadius(map.maxRadius, map.clusterRadiusSpacing),
    }
}

export async function mapCard(origin: string, pageData: Extract<PageData, { kind: 'mapper' }>, settings: Settings): Promise<MapCard | undefined> {
    setOrigin(origin)
    const { geographyKind, universe, script } = pageData.settings
    if (geographyKind === undefined || universe === undefined) {
        return undefined
    }

    const executed = await createRequestExecutor()({ descriptor: { kind: 'mapper', geographyKind, universe }, stmts: computeUSS(script) })
    const result = executed.resultingValue?.value as MapResult | undefined
    if (result === undefined) {
        return undefined
    }
    const { opaqueType, value: map } = result
    const visuals = mapVisuals(result)

    let contents: MapContents
    switch (opaqueType) {
        case 'cMap':
        case 'cMapRGB':
            contents = await shapeContents(geographyKind, universe, map, visuals.colors)
            break
        case 'pMap':
            contents = await pointContents(geographyKind, universe, map, visuals.colors)
            break
        case 'clusterMap':
            contents = await clusterContents(geographyKind, universe, map, visuals.bins!, visuals.ramp!.colors)
            break
    }

    const label = map.label ?? deriveMapLabel(script.uss, defaultTypeEnvironment(universe))
    return {
        label: label === undefined ? '' : reifyString(label, {}),
        contents,
        opacity: map.opacity,
        insets: map.insets,
        basemap: map.basemap,
        ramp: visuals.ramp === undefined
            ? undefined
            : {
                    ticks: visuals.ramp.ticks,
                    colors: visuals.ramp.colors,
                    unit: map.unit === undefined ? undefined : unitTypeToStoredUnit(map.unit),
                },
        units: settings.getMultiple(['use_imperial', 'temperature_unit']),
    }
}

export async function loadShape(origin: string, longname: string): Promise<Ring[]> {
    setOrigin(origin)
    return rings(geometry(await loadFeatureFromPossibleSymlink(longname) as NormalizeProto<Feature>))
}
