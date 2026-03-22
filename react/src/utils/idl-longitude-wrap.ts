/**
 * Minimize longitude span for US + Pacific territories (e.g. Guam, American Samoa).
 * Matches SYAU `FirstZoom` / `optimizeWrapping`: when raw longitudes span ~300° because
 * positive Pacific lon and negative mainland lon are far in numeric space, shifting
 * positive longitudes by −360° makes a contiguous bbox for fitBounds and for MapLibre's
 * clustered GeoJSON / supercluster index.
 */

function longitudeSpan(xs: number[]): number {
    return Math.max(...xs) - Math.min(...xs)
}

/**
 * Returns either `lons` or per-point IDL-shifted longitudes (`lon > 0 ? lon - 360 : lon`),
 * whichever yields the smaller numeric span. Used by SYAU for fitBounds.
 */
export function optimizeWrappingLongitudes(lons: number[]): number[] {
    const lonsAboutIDL = lons.map(lon => (lon > 0 ? lon - 360 : lon))
    if (longitudeSpan(lons) < longitudeSpan(lonsAboutIDL)) {
        return lons
    }
    return lonsAboutIDL
}

/**
 * Clone point features and apply the same IDL wrap rule so clustered GeoJSON matches SYAU bounds.
 * Non-Point features are returned unchanged.
 */
export function wrapPointFeaturesForClustering(features: GeoJSON.Feature[]): GeoJSON.Feature[] {
    const pointLons: number[] = []
    for (const f of features) {
        if (f.geometry?.type === 'Point') {
            pointLons.push((f.geometry as GeoJSON.Point).coordinates[0])
        }
    }
    if (pointLons.length === 0) {
        return features
    }
    const lonsAboutIDL = pointLons.map(lon => (lon > 0 ? lon - 360 : lon))
    const useIdlWrap = !(longitudeSpan(pointLons) < longitudeSpan(lonsAboutIDL))

    return features.map((f) => {
        if (f.geometry?.type !== 'Point') {
            return f
        }
        const coords = (f.geometry as GeoJSON.Point).coordinates
        const lon = coords[0]
        const newLon = useIdlWrap && lon > 0 ? lon - 360 : lon
        if (newLon === lon) {
            return f
        }
        return {
            ...f,
            geometry: {
                ...f.geometry,
                coordinates: [newLon, coords[1]],
            },
        }
    })
}
