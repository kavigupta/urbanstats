import { Feature } from './protos'
import { NormalizeProto } from './types'

export function geometry(poly: NormalizeProto<Feature>): GeoJSON.Geometry {
    if (poly.geometry === 'multipolygon') {
        const polys = poly.multipolygon.polygons
        const coords = polys.map(
            multiPoly => multiPoly.rings.map(
                ring => ring.coords.map(
                    coordinate => [coordinate.lon, coordinate.lat],
                ),
            ),
        )
        return {
            type: 'MultiPolygon',
            coordinates: coords,
        }
    }
    else {
        const coords = poly.polygon.rings.map(
            ring => ring.coords.map(
                coordinate => [coordinate.lon, coordinate.lat],
            ),
        )
        return {
            type: 'Polygon',
            coordinates: coords,
        }
    }
}
