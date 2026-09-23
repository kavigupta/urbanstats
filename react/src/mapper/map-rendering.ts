/* Shared by the page and the embed card, which can't import `map-generator` since it pulls in maplibre. */
import { loadProtobuf } from '../load_json'
import { indexLink } from '../navigation/links'
import { loadCentroids } from '../syau/load'
import { Universe } from '../universe'
import { doRender } from '../urban-stats-script/constants/color-utils'
import { MissingData } from '../urban-stats-script/constants/map'
import { instantiate, ScaleInstance } from '../urban-stats-script/constants/scale'
import { USSOpaqueValue } from '../urban-stats-script/types-values'
import { GeographySelection } from '../urban-stats-script/workerManager'
import { furthestColor, interpolateColor } from '../utils/color'
import { ICoordinate } from '../utils/protos'

import { Keypoints } from './ramps'

/** Pixel sizes in map settings, such as marker radii, are relative to this width. Tall maps are 1200 tall instead. */
export function canonicalWidth(aspectRatio: number): number {
    return 1200 * Math.min(1, aspectRatio)
}

/** Longnames are unique across geographies, so several geographies' lookups merge into one. */
export async function mergedByName<T>(geographies: GeographySelection[], load: (g: GeographySelection) => Promise<Map<string, T>>): Promise<Map<string, T>> {
    const loaded = await Promise.all(geographies.map(load))
    return new Map(loaded.flatMap(byName => Array.from(byName.entries())))
}

/** The universe each geography came from, keyed by longname. */
export async function universesByName(geographies: GeographySelection[]): Promise<Map<string, Universe>> {
    return mergedByName(geographies, async (g) => {
        const ordering = await loadProtobuf(indexLink(g.universe, g.geographyKind), 'ArticleOrderingList')
        return new Map(ordering.longnames.map(longname => [longname, g.universe]))
    })
}

/** Keyed by longname, which is how a map's result names its geographies. */
export async function centroidsByName(universe: Universe, geographyKind: string): Promise<Map<string, ICoordinate>> {
    const ordering = await loadProtobuf(indexLink(universe, geographyKind), 'ArticleOrderingList')
    const centroids = await loadCentroids(universe, geographyKind, ordering.longnames)
    return new Map(ordering.longnames.map((longname, i) => [longname, centroids[i]]))
}

/** The stops the colourbar shows, which are also the bins a cluster map's categories are counted in. */
function rampTicks(scale: ScaleInstance): number[] {
    return [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map(scale.inverse)
}

/** What a map with no colour of its own paints a missing value: nothing, so the basemap shows through. */
// eslint-disable-next-line no-restricted-syntax -- not a theme colour; it is the absence of one
const hiddenColor = '#00000000'

/** An RGB map has no ramp to be furthest from, so a shown missing value gets a fixed colour. */
// eslint-disable-next-line no-restricted-syntax -- the conventional no-data magenta
const rgbMissingColor = '#ff00ff'

/** Computes the ramp's expensive contrast colour once, and only when `missingColor` is unset. */
export function rampColorer(ramp: Keypoints, scale: ScaleInstance, missingColor?: string): (value: number) => string {
    const missing = missingColor ?? furthestColor(ramp.map(([, color]) => color))
    return value => interpolateColor(ramp, scale.forward(value), missing)
}

/** Missing values go one past the last tick, into the extra category `mapVisuals` colours for them. */
function rampBin(value: number, scale: ScaleInstance, bins: number): number {
    const position = scale.forward(value)
    return isNaN(position) ? bins : Math.max(0, Math.min(bins - 1, Math.round(position * (bins - 1))))
}

/** Marker areas are what the data scales, so the radius drawn is the root of one. */
export function markerRadius(relativeArea: number, maxRadius: number): number {
    return Math.sqrt(relativeArea) * maxRadius
}

/** The area a marker's radius stands for, which is what clustering sums. */
export function markerArea(radius: number): number {
    return radius ** 2
}

/* What `executeRequest` returns for a mapper descriptor, as `executeAsync`'s overloads state. */
export type MapResult = USSOpaqueValue & { opaqueType: 'cMap' | 'cMapRGB' | 'pMap' | 'clusterMap' }

export interface MapVisuals {
    /** One fill per geography, in the order the result names them. */
    colors: string[]
    /** Absent on an RGB map, which has no single scale. Its colours are the colourbar's. */
    ramp?: { scale: ScaleInstance, ticks: number[], colors: string[] }
    /** Which tick each geography falls on, on a cluster map; one past the last for a missing value. */
    bins?: number[]
    /** A cluster map's pie-slice colours: the colourbar's, plus one for missing values. */
    categoryColors?: string[]
}

/** What a missing value is painted: nothing unless drawn, then its own colour or `automatic`. */
function missingFill<T extends string | undefined>(missingData: MissingData | undefined, automatic: T): string | T {
    if (missingData === undefined) {
        return hiddenColor
    }
    return missingData.color === undefined ? automatic : doRender(missingData.color)
}

export function mapVisuals(result: MapResult): MapVisuals {
    if (result.opaqueType === 'cMapRGB') {
        const rgb = result.value
        const missing = missingFill(rgb.missingData, rgbMissingColor)
        return {
            colors: rgb.dataR.map((r, i) => {
                const [g, b, a] = [rgb.dataG[i], rgb.dataB[i], rgb.dataA[i]]
                return isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a) ? missing : doRender({ r, g, b, a })
            }),
        }
    }
    const map = result.value
    const scale = instantiate(map.scale)
    const ticks = rampTicks(scale)
    const colorer = rampColorer(map.ramp, scale, missingFill(map.missingData, undefined))
    const ramp = { scale, ticks, colors: ticks.map(colorer) }
    if (result.opaqueType === 'clusterMap') {
        // Discretized so a cluster's slices are counted in the same bins the colourbar shows.
        const bins = map.data.map(value => rampBin(value, scale, ticks.length))
        const categoryColors = [...ramp.colors, colorer(NaN)]
        return { colors: bins.map(bin => categoryColors[bin]), ramp, bins, categoryColors }
    }
    return { colors: map.data.map(colorer), ramp }
}
