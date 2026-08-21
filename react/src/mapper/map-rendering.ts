/*
 * What the page and the link-embed card both derive from a map's result: where its geographies
 * are, and the colours and sizes their data implies. The card draws without maplibre, so anything
 * the two share has to live here rather than in `map-generator`, which pulls the map stack in.
 */
import { loadProtobuf } from '../load_json'
import { indexLink } from '../navigation/links'
import { loadCentroids } from '../syau/load'
import { Universe } from '../universe'
import { doRender } from '../urban-stats-script/constants/color-utils'
import { instantiate, ScaleInstance } from '../urban-stats-script/constants/scale'
import { USSOpaqueValue } from '../urban-stats-script/types-values'
import { furthestColor, interpolateColor } from '../utils/color'
import { ICoordinate } from '../utils/protos'

import { Keypoints } from './ramps'

/**
 * The width the mapper lays a map out at before scaling the whole thing to fit its container. Pixel
 * sizes in a map's settings, marker radii above all, are in these pixels, so anything drawing a map
 * at another width has to scale them against this.
 */
export const canonicalWidth = 1200

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

/** Returns a function rather than colouring a list, so the ramp's expensive contrast colour is computed once per map. */
export function rampColorer(ramp: Keypoints, scale: ScaleInstance): (value: number) => string {
    const furthest = furthestColor(ramp.map(([, color]) => color))
    return value => interpolateColor(ramp, scale.forward(value), furthest)
}

function rampBin(value: number, scale: ScaleInstance, bins: number): number {
    return Math.max(0, Math.min(bins - 1, Math.round(scale.forward(value) * (bins - 1))))
}

/** Marker areas are what the data scales, so the radius drawn is the root of one. */
export function markerRadius(relativeArea: number, maxRadius: number): number {
    return Math.sqrt(relativeArea) * maxRadius
}

/** The area a marker's radius stands for, which is what clustering sums. */
export function markerArea(radius: number): number {
    return radius ** 2
}

/*
 * The map result as a mapper request produces it. `executeRequest` is typed for any USS value;
 * asking for a mapper descriptor is what makes it one of these, the same narrowing `executeAsync`
 * states in its overloads.
 */
export type MapResult = USSOpaqueValue & { opaqueType: 'cMap' | 'cMapRGB' | 'pMap' | 'clusterMap' }

export interface MapVisuals {
    /** One fill per geography, in the order the result names them. */
    colors: string[]
    /** Absent on an RGB map, which has no single scale. Its colours are the colourbar's. */
    ramp?: { scale: ScaleInstance, ticks: number[], colors: string[] }
    /** Which tick each geography falls on, on a cluster map. */
    bins?: number[]
}

export function mapVisuals(result: MapResult): MapVisuals {
    if (result.opaqueType === 'cMapRGB') {
        const rgb = result.value
        return { colors: rgb.dataR.map((r, i) => doRender({ r, g: rgb.dataG[i], b: rgb.dataB[i], a: rgb.dataA[i] })) }
    }
    const map = result.value
    const scale = instantiate(map.scale)
    const ticks = rampTicks(scale)
    const colorer = rampColorer(map.ramp, scale)
    const ramp = { scale, ticks, colors: ticks.map(colorer) }
    if (result.opaqueType === 'clusterMap') {
        // Discretized so a cluster's slices are counted in the same bins the colourbar shows.
        const bins = map.data.map(value => rampBin(value, scale, ticks.length))
        return { colors: bins.map(bin => ramp.colors[bin]), ramp, bins }
    }
    return { colors: map.data.map(colorer), ramp }
}
