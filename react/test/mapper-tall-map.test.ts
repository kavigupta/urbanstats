import { downloadPNG, getErrors, urlFromCode } from './mapper-utils'
import { screencap, urbanstatsFixture } from './test_utils'

// Argentina is much taller than it is wide, so it is laid out at 1200 tall rather than 1200 wide.
const argentina = `
pMap(
    data=density_pw_1km,
    scale=logScale(),
    ramp=rampUridis,
    relativeArea=population,
    maxRadius=20,
    basemap=noBasemap()
)
`

urbanstatsFixture('tall map', urlFromCode('Urban Center', 'Argentina', argentina))

test('tall-map-argentina', async (t) => {
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: false })
    await downloadPNG(t)
})
