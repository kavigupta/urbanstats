import assert from 'assert/strict'
import { test } from 'node:test'

import { shapesInUniverse } from '../src/consolidated-shapes'
import universes_ordered from '../src/data/universes_ordered'
import { loadGzipped, loadProtobuf } from '../src/load_json'
import { geometry } from '../src/map-partition'
import { consolidatedShapeLink } from '../src/navigation/links'
import { Feature } from '../src/utils/protos'
import { NormalizeProto } from '../src/utils/types'

import './util/fetch'

async function checkAgainstProtobuf(geographyKind: string, universe: string): Promise<number> {
    const universeIdx = universes_ordered.indexOf(universe as typeof universes_ordered[number])
    const lean = shapesInUniverse((await loadGzipped(consolidatedShapeLink(geographyKind)))!, universeIdx)
    const whole = await loadProtobuf(consolidatedShapeLink(geographyKind), 'ConsolidatedShapes')

    const expected = new Map<string, GeoJSON.Geometry>()
    for (let i = 0; i < whole.longnames.length; i++) {
        if (whole.universes[i].universeIdxs!.includes(universeIdx)) {
            expected.set(whole.longnames[i], geometry(whole.shapes[i] as NormalizeProto<Feature>))
        }
    }

    assert.deepEqual([...lean.keys()].sort(), [...expected.keys()].sort())
    for (const [longname, shape] of expected) {
        assert.deepEqual(lean.get(longname), shape, longname)
    }
    return expected.size
}

void test('shapes-in-universe-matches-protobufjs', async () => {
    // Subnational Region is the largest file and the one whose decode cost this avoids; Urban Center
    // is a smaller file whose universe holds a different slice of it.
    assert.ok(await checkAgainstProtobuf('Subnational Region', 'USA') > 0)
    assert.ok(await checkAgainstProtobuf('Urban Center', 'world') > 0)
})
