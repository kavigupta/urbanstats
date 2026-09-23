/* Clusters points with supercluster configured as maplibre configures it, so the card groups them as the page does. */
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

/** One list per inset. Radii are scaled against the largest marker on the whole map, as `ClusterScaleProvider` does. */
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
        // Not in place: supercluster seeds a cluster with a shallow copy of a child, whose array this still is.
        reduce: (accumulated, props) => {
            accumulated.byCategory = accumulated.byCategory.map((size, i) => size + props.byCategory[i])
        },
    })
    index.load(contents.points.map(point => ({
        type: 'Feature' as const,
        properties: { byCategory: contents.categoryColors.map((_, i) => i === point.category ? point.size : 0) },
        geometry: { type: 'Point' as const, coordinates: [point.lon, point.lat] },
    })))

    const total = (byCategory: number[]): number => byCategory.reduce((sum, size) => sum + size, 0)
    const perInset = insets.map(({ inset, layout }) => {
        // The page's zoom, since the card is a scaled-down copy of the page's render.
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
