import { getErrors } from './mapper-utils'
import { mapper, screencap } from './test_utils'

function drawing(data: string): string {
    return `cMap(data=${data}, scale=linearScale(), ramp=rampUridis)`
}

// A script part-way through being written, multiplying a difference of two readings by a name that
// does not exist. Reading that for its units once threw, which took the whole page down with it.
mapper(() => test)('a name that does not exist is reported rather than thrown', {
    code: drawing('(high_temp - low_temp) * a'),
}, async (t) => {
    await t.expect(await getErrors()).eql(['Undefined variable: a at 1:36'])
})

mapper(() => test)('a difference of two readings can be scaled by a quantity', {
    code: drawing('(high_temp - low_temp) * area'),
}, async (t) => {
    await t.expect(await getErrors()).eql([])
})

mapper(() => test)('nothing divides into a reading, where the degrees between two divide', {
    code: drawing('1 / (high_temp - low_temp)'),
}, async (t) => {
    await t.expect(await getErrors()).eql([])
})

// The legend is where a unit of more than one dimension is hardest to write, so these two are
// screenshots rather than assertions: the ramp has to lay out a name no pool holds outright.
mapper(() => test)('a legend of a mass in a volume over an area', {
    code: drawing('pm25_pollution * area'), geo: 'Subnational Region', universe: 'USA',
}, async (t) => {
    await screencap(t, { removeEntireMap: true })
})

mapper(() => test)('a legend of degrees times an area', {
    code: drawing('(high_temp - low_temp) * area'), geo: 'Subnational Region', universe: 'USA',
}, async (t) => {
    await screencap(t, { removeEntireMap: true })
})
