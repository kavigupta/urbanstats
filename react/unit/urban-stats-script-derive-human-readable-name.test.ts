import assert from 'assert/strict'
import test from 'node:test'

import { defaultTypeEnvironment } from '../src/mapper/context'
import { mapUSSFromString } from '../src/mapper/settings/map-uss'
import { deriveMapLabel, reifyString } from '../src/urban-stats-script/derive-human-readable-name'
import { TypeEnvironment } from '../src/urban-stats-script/types-values'

function getTypeEnvironment(): TypeEnvironment {
    return defaultTypeEnvironment('USA')
}

let mapLabelIdx = 0

function testMapLabel(testFn: typeof test, code: string, expectedLabel: string): void {
    void testFn(`map label ${++mapLabelIdx}`, () => {
        const label = deriveMapLabel(mapUSSFromString(code), getTypeEnvironment())
        assert.ok(label)
        assert.equal(reifyString(label), expectedLabel)
    })
}

testMapLabel(test,
    `condition (population > 1000000)
condition (population_2000 > 1000000)
cMap(
    data=asin((density_pw_1km / population ** 3) ** 2),
    scale=linearScale(),
    ramp=rampUridis
)`,
    'sin^{-1}((PW Density (r=1km) ÷ Population^{3})^{2}) where Population (2000) > 1000000 and Population > 1000000',
)

testMapLabel(test,
    `condition(population > 1m)
cMap(data=density_pw_1km_2000 / (density_pw_1km * density_pw_2km), scale=linearScale(), ramp=rampUridis)`,
    'PW Density (r=1km) (2000) ÷ (PW Density (r=1km) × PW Density (r=2km)) where Population > 1000000',
)
