/*
 * Merges a cluster map's points the way the page does, with the same supercluster the page's
 * maplibre source runs, configured as maplibre configures it: a radius in the pixels of a 512px
 * tile, so the grouping is the one a reader of the page would see.
 */
import Supercluster from 'supercluster'

import { clusterMaxZoom, proportionalRelativeArea } from '../../src/syau/cluster-geometry'
import { Inset } from '../../src/urban-stats-script/constants/insets'

import { MapContents } from './data'
import { MapLayout } from './map-layout'

/** The tile size maplibre gives a GeoJSON source, which its cluster radius is measured against. */
const superclusterTile = 512

interface Sizes {
    /** One entry per ramp bin, summing to the marker's area. */
    byCategory: number[]
}

export interface Marker {
    lon: number
    lat: number
    byCategory: number[]
    radius: number
}

/**
 * One list of markers per inset. Radii are shared rather than per-inset, since a marker's size is
 * only readable against the biggest one anywhere on the map -- the page shares them the same way,
 * through `ClusterScaleProvider`.
 */
export function clusterMarkers(
    contents: MapContents & { kind: 'clusters' },
    insets: { inset: Inset, layout: MapLayout }[],
    scale: number,
): Marker[][] {
    const index = new Supercluster<Sizes, Sizes>({
        extent: superclusterTile,
        radius: contents.clusterRadius,
        maxZoom: clusterMaxZoom,
        map: props => ({ byCategory: props.byCategory.slice() }),
        reduce: (accumulated, props) => {
            for (let i = 0; i < accumulated.byCategory.length; i++) {
                accumulated.byCategory[i] += props.byCategory[i]
            }
        },
    })
    index.load(contents.points.map(point => ({
        type: 'Feature' as const,
        properties: { byCategory: contents.categoryColors.map((_, i) => i === point.category ? point.size : 0) },
        geometry: { type: 'Point' as const, coordinates: [point.lon, point.lat] },
    })))

    const total = (byCategory: number[]): number => byCategory.reduce((sum, size) => sum + size, 0)
    const perInset = insets.map(({ inset, layout }) => {
        // The zoom the page would be at: the card's box may be narrower than the page's own render,
        // and clustering happens before that scaling rather than after it.
        const zoom = Math.log2(layout.scale / scale / superclusterTile)
        return index.getClusters(inset.coordBox, zoom).map(feature => ({
            lon: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1],
            byCategory: feature.properties.byCategory,
        }))
    })

    const largest = Math.max(...perInset.flat().map(marker => total(marker.byCategory)), 0)
    return perInset.map(markers => markers.map(marker => ({
        ...marker,
        radius: contents.maxRadius * Math.sqrt(proportionalRelativeArea(total(marker.byCategory), largest)),
    })))
}
