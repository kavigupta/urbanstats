import assert from 'assert/strict'
import { test } from 'node:test'

import { shapesByName } from '../src/consolidated-shapes'
import universes_ordered from '../src/data/universes_ordered'
import { loadProtobuf } from '../src/load_json'
import { consolidatedShapeLink } from '../src/navigation/links'
import { Universe } from '../src/universe'
import { geometry } from '../src/utils/geometry'
import { Feature } from '../src/utils/protos'
import { NormalizeProto } from '../src/utils/types'

import './util/fetch'

async function checkAgainstProtobuf(geographyKind: string, universe: Universe): Promise<void> {
    const universeIdx = universes_ordered.indexOf(universe)
    const lean = await shapesByName(universe, geographyKind)
    const whole = await loadProtobuf(consolidatedShapeLink(geographyKind), 'ConsolidatedShapes')

    const expected = new Map<string, GeoJSON.Geometry>()
    for (let i = 0; i < whole.longnames.length; i++) {
        if (whole.universes[i].universeIdxs!.includes(universeIdx)) {
            expected.set(whole.longnames[i], geometry(whole.shapes[i] as NormalizeProto<Feature>))
        }
    }

    assert.ok(expected.size > 0)
    assert.deepEqual([...lean.keys()].sort(), [...expected.keys()].sort())
    for (const [longname, shape] of expected) {
        assert.deepEqual(lean.get(longname), shape, longname)
    }
}

void test('shapes-in-universe-matches-protobufjs', async () => {
    // Subnational Region is the largest file and the one whose decode cost this avoids; Urban Center
    // is a smaller file whose universe holds a different slice of it.
    await checkAgainstProtobuf('Subnational Region', 'USA')
    await checkAgainstProtobuf('Urban Center', 'world')
})
