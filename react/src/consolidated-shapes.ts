/*
 * Reads a consolidated shape file into the geometries one universe contains, keyed by longname.
 *
 * Decoding the file through protobufjs costs ~130 MiB on the largest geography, because the schema
 * makes every coordinate its own message and so its own object. This walks the message instead,
 * noting where each shape's bytes start and decoding only the ones the universe holds. The field
 * numbers here are the ones in data_files.proto.
 */
import Pbf from 'pbf'

import universes_ordered from './data/universes_ordered'
import { loadGzipped } from './load_json'
import { consolidatedShapeLink } from './navigation/links'
import { Universe } from './universe'

/** pbf's own readFloat goes through an ieee754 polyfill, which costs about a third of a decode. */
const float = new Float32Array(1)
const bits = new Uint32Array(float.buffer)

function readFloat(pbf: Pbf): number {
    bits[0] = pbf.readFixed32()
    return float[0]
}

function readCoordinate(pbf: Pbf): GeoJSON.Position {
    const coordinate: GeoJSON.Position = [0, 0]
    pbf.readMessage((tag) => {
        switch (tag) {
            case 1:
                coordinate[0] = readFloat(pbf)
                break
            case 2:
                coordinate[1] = readFloat(pbf)
                break
        }
    })
    return coordinate
}

/** Ring, Polygon and MultiPolygon are each a message holding one repeated field 1. */
function repeated<T>(pbf: Pbf, readItem: (pbf: Pbf) => T): T[] {
    const items: T[] = []
    pbf.readMessage((tag) => {
        if (tag === 1) {
            items.push(readItem(pbf))
        }
    })
    return items
}

const readRing = (pbf: Pbf): GeoJSON.Position[] => repeated(pbf, readCoordinate)
const readPolygon = (pbf: Pbf): GeoJSON.Position[][] => repeated(pbf, readRing)
const readMultiPolygon = (pbf: Pbf): GeoJSON.Position[][][] => repeated(pbf, readPolygon)

/** A shape with neither geometry field set reads as an empty polygon, as protobufjs's would. */
function readFeature(pbf: Pbf, start: number): GeoJSON.Geometry {
    let geometry: GeoJSON.Geometry = { type: 'Polygon', coordinates: [] }
    pbf.pos = start
    pbf.readMessage((tag) => {
        switch (tag) {
            case 1:
                geometry = { type: 'Polygon', coordinates: readPolygon(pbf) }
                break
            case 2:
                geometry = { type: 'MultiPolygon', coordinates: readMultiPolygon(pbf) }
                break
        }
    })
    return geometry
}

function readUniverses(pbf: Pbf): number[] {
    const idxs: number[] = []
    pbf.readMessage((tag) => {
        if (tag === 1) {
            pbf.readPackedVarint(idxs)
        }
    })
    return idxs
}

export async function shapesByName(universe: Universe, geographyKind: string): Promise<Map<string, GeoJSON.Geometry>> {
    const universeIdx = universes_ordered.indexOf(universe)
    const pbf = new Pbf(await loadGzipped(consolidatedShapeLink(geographyKind)))
    const longnames: string[] = []
    const universes: number[][] = []
    const shapeStarts: number[] = []

    pbf.readFields((tag) => {
        switch (tag) {
            case 1:
                longnames.push(pbf.readString())
                break
            case 2:
                // leaving pos on the length varint both records the shape and makes readFields skip it
                shapeStarts.push(pbf.pos)
                break
            case 3:
                universes.push(readUniverses(pbf))
                break
        }
    })

    const geometries = new Map<string, GeoJSON.Geometry>()
    for (let i = 0; i < longnames.length; i++) {
        if (universes[i].includes(universeIdx)) {
            geometries.set(longnames[i], readFeature(pbf, shapeStarts[i]))
        }
    }
    return geometries
}
