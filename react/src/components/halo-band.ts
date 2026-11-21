import ClipperLib from 'clipper-lib'

// Clipper works in integers, so project to this many units per screen pixel
const unitsPerPx = 4

function worldSize(zoom: number): number {
    return 512 * 2 ** zoom * unitsPerPx
}

function mercator([lon, lat]: GeoJSON.Position): [number, number] {
    const sinLat = Math.sin(lat * Math.PI / 180)
    return [(lon + 180) / 360, 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)]
}

function project(position: GeoJSON.Position, size: number): ClipperLib.IntPoint {
    const [x, y] = mercator(position)
    return { X: Math.round(x * size), Y: Math.round(y * size) }
}

function unproject({ X, Y }: ClipperLib.IntPoint, size: number): GeoJSON.Position {
    return [
        X / size * 360 - 180,
        Math.atan(Math.sinh(Math.PI * (1 - 2 * Y / size))) * 180 / Math.PI,
    ]
}

function rings(geometry: GeoJSON.Geometry): GeoJSON.Position[][] {
    return polygons(geometry).flat()
}

function polygons(geometry: GeoJSON.Geometry): GeoJSON.Position[][][] {
    switch (geometry.type) {
        case 'Polygon':
            return [geometry.coordinates]
        case 'MultiPolygon':
            return geometry.coordinates
        default:
            return []
    }
}

/**
 * Polsby-Popper score in Web Mercator:
 *     4 pi area / perimeter^2
 */
export function compactness(geometry: GeoJSON.Geometry): number {
    let area = 0
    let perimeter = 0
    for (const polygon of polygons(geometry)) {
        polygon.forEach((ring, i) => {
            const points = ring.map(mercator)
            let ringArea = 0
            for (let j = 0; j + 1 < points.length; j++) {
                const [x1, y1] = points[j]
                const [x2, y2] = points[j + 1]
                ringArea += x1 * y2 - x2 * y1
                perimeter += Math.hypot(x2 - x1, y2 - y1)
            }
            area += (i === 0 ? 1 : -1) * Math.abs(ringArea) / 2
        })
    }
    return perimeter === 0 ? 0 : 4 * Math.PI * area / perimeter ** 2
}

/**
 * Returns the polygon minus its inset by widthPx at the given zoom.
 */
export function haloBand(geometry: GeoJSON.Geometry, zoom: number, widthPx: number): GeoJSON.MultiPolygon {
    const size = worldSize(zoom)
    const paths = rings(geometry).map(ring => ClipperLib.JS.Lighten(ring.map(p => project(p, size)), unitsPerPx / 2))
    // Normalizes ring orientation so holes grow when the polygon is inset
    const polygon = ClipperLib.Clipper.SimplifyPolygons(paths, ClipperLib.PolyFillType.pftEvenOdd)

    const offset = new ClipperLib.ClipperOffset(2, unitsPerPx / 4)
    offset.AddPaths(polygon, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon)
    const inset: ClipperLib.Paths = []
    offset.Execute(inset, -widthPx * unitsPerPx)

    const clipper = new ClipperLib.Clipper()
    clipper.AddPaths(polygon, ClipperLib.PolyType.ptSubject, true)
    clipper.AddPaths(inset, ClipperLib.PolyType.ptClip, true)
    const tree = new ClipperLib.PolyTree()
    clipper.Execute(ClipperLib.ClipType.ctDifference, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero)

    const close = (path: ClipperLib.Path): GeoJSON.Position[] => {
        const ring = path.map(p => unproject(p, size))
        return [...ring, ring[0]]
    }
    return {
        type: 'MultiPolygon',
        coordinates: ClipperLib.JS.PolyTreeToExPolygons(tree).map(({ outer, holes }) => [close(outer), ...holes.map(close)]),
    }
}
