/*
 * Reads a consolidated shape file into the geometries one universe contains.
 *
 * Decoding the file through protobufjs costs ~130 MiB on the largest geography, because the schema
 * makes every coordinate its own message and so its own object. This walks the message instead,
 * noting where each shape's bytes start and decoding only the ones the universe holds, straight into
 * the GeoJSON its callers want.
 */
import Pbf from 'pbf'

interface Span {
    start: number
    end: number
}

function span(pbf: Pbf): Span {
    const length = pbf.readVarint()
    const start = pbf.pos
    return { start, end: start + length }
}

function readCoordinate(pbf: Pbf, end: number): GeoJSON.Position {
    let lon = 0
    let lat = 0
    while (pbf.pos < end) {
        const tag = pbf.readVarint()
        switch (tag >> 3) {
            case 1:
                lon = pbf.readFloat()
                break
            case 2:
                lat = pbf.readFloat()
                break
            default:
                pbf.skip(tag)
        }
    }
    return [lon, lat]
}

function readRing(pbf: Pbf, end: number): GeoJSON.Position[] {
    const ring: GeoJSON.Position[] = []
    while (pbf.pos < end) {
        const tag = pbf.readVarint()
        if (tag >> 3 === 1) {
            const coordinate = span(pbf)
            ring.push(readCoordinate(pbf, coordinate.end))
            pbf.pos = coordinate.end
        }
        else {
            pbf.skip(tag)
        }
    }
    return ring
}

function readPolygon(pbf: Pbf, end: number): GeoJSON.Position[][] {
    const rings: GeoJSON.Position[][] = []
    while (pbf.pos < end) {
        const tag = pbf.readVarint()
        if (tag >> 3 === 1) {
            const ring = span(pbf)
            rings.push(readRing(pbf, ring.end))
            pbf.pos = ring.end
        }
        else {
            pbf.skip(tag)
        }
    }
    return rings
}

function readMultiPolygon(pbf: Pbf, end: number): GeoJSON.Position[][][] {
    const polygons: GeoJSON.Position[][][] = []
    while (pbf.pos < end) {
        const tag = pbf.readVarint()
        if (tag >> 3 === 1) {
            const polygon = span(pbf)
            polygons.push(readPolygon(pbf, polygon.end))
            pbf.pos = polygon.end
        }
        else {
            pbf.skip(tag)
        }
    }
    return polygons
}

/** A shape with neither geometry field set reads as an empty polygon, as protobufjs's would. */
function readFeature(pbf: Pbf, feature: Span): GeoJSON.Geometry {
    let geometry: GeoJSON.Geometry = { type: 'Polygon', coordinates: [] }
    pbf.pos = feature.start
    while (pbf.pos < feature.end) {
        const tag = pbf.readVarint()
        switch (tag >> 3) {
            case 1: {
                const polygon = span(pbf)
                geometry = { type: 'Polygon', coordinates: readPolygon(pbf, polygon.end) }
                pbf.pos = polygon.end
                break
            }
            case 2: {
                const multipolygon = span(pbf)
                geometry = { type: 'MultiPolygon', coordinates: readMultiPolygon(pbf, multipolygon.end) }
                pbf.pos = multipolygon.end
                break
            }
            default:
                pbf.skip(tag)
        }
    }
    return geometry
}

function readUniverses(pbf: Pbf, end: number): number[] {
    const idxs: number[] = []
    while (pbf.pos < end) {
        const tag = pbf.readVarint()
        if (tag >> 3 !== 1) {
            pbf.skip(tag)
        }
        else if ((tag & 7) === 2) {
            const packed = span(pbf)
            while (pbf.pos < packed.end) {
                idxs.push(pbf.readVarint())
            }
        }
        else {
            idxs.push(pbf.readVarint())
        }
    }
    return idxs
}

/** The geometry of every shape in the file that the universe contains, by longname. */
export function shapesInUniverse(shapeFile: Uint8Array, universeIdx: number): Map<string, GeoJSON.Geometry> {
    const pbf = new Pbf(shapeFile)
    const longnames: string[] = []
    const universes: number[][] = []
    const shapes: Span[] = []

    while (pbf.pos < pbf.length) {
        const tag = pbf.readVarint()
        switch (tag >> 3) {
            case 1:
                longnames.push(pbf.readString())
                break
            case 2: {
                const shape = span(pbf)
                shapes.push(shape)
                pbf.pos = shape.end
                break
            }
            case 3: {
                const universe = span(pbf)
                universes.push(readUniverses(pbf, universe.end))
                pbf.pos = universe.end
                break
            }
            default:
                pbf.skip(tag)
        }
    }

    const geometries = new Map<string, GeoJSON.Geometry>()
    for (let i = 0; i < longnames.length; i++) {
        if (universes[i].includes(universeIdx)) {
            geometries.set(longnames[i], readFeature(pbf, shapes[i]))
        }
    }
    return geometries
}
