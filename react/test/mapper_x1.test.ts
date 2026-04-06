import { checkGeojson, downloadPNG, getCodeFromMainField, getErrors, toggleCustomScript, urlFromCode } from './mapper-utils'
import { safeReload, screencap, urbanstatsFixture } from './test_utils'

function testCode(testFn: () => TestFn, geographyKind: string, universe: string, code: string, name: string, includeGeojson: boolean = false): void {
    const url = urlFromCode(geographyKind, universe, code)
    urbanstatsFixture(name, url)

    testFn()(name, async (t) => {
        await t.expect(code.trim()).eql((await getCodeFromMainField()).trim())
        await t.expect(getErrors()).eql([])
        await toggleCustomScript(t)
        // now in autoux mode
        await t.expect(getErrors()).eql([])
        await toggleCustomScript(t)
        // now in custom mode
        await t.expect(getErrors()).eql([])
        await t.expect(code.trim()).eql((await getCodeFromMainField()).trim())
        await toggleCustomScript(t)
        // now in autoux mode
        await t.expect(getErrors()).eql([])
        await safeReload(t)
        await toggleCustomScript(t)
        // back to custom mode
        await t.expect(code.trim()).eql((await getCodeFromMainField()).trim())
        await screencap(t, { removeEntireMap: false })
        if (includeGeojson) {
            await checkGeojson(t, `mapping-geojson-${name}`)
        }
        await downloadPNG(t)
    })
}

const clusterMapBasic = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapBasic, 'cluster-map-basic')

const clusterMapWeightedByArea = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    relativeArea=area,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapWeightedByArea, 'cluster-map-weight-by-area')

const clusterMapCommuteTransitPopulation = `
clusterMap(
    data=commute_transit,
    scale=linearScale(max=0.25),
    ramp=rampUridis,
    maxRadius=60,
    relativeArea=population
)
`

testCode(() => test, 'County', 'USA', clusterMapCommuteTransitPopulation, 'cluster-map-commute-transit-population')

const clusterMapCommuteTransitArea = `
clusterMap(
    data=commute_transit,
    scale=linearScale(max=0.25),
    ramp=rampUridis,
    maxRadius=60,
    relativeArea=area
)
`

testCode(() => test, 'County', 'USA', clusterMapCommuteTransitArea, 'cluster-map-commute-transit-area')

const clusterMapRampBone = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampBone,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapRampBone, 'cluster-map-ramp-bone')

const clusterMapRampViridis = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampViridis,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapRampViridis, 'cluster-map-ramp-viridis')

const clusterMapOpacity = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    opacity=0.45,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapOpacity, 'cluster-map-opacity')

const clusterMapMaxRadius = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    maxRadius=100,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapMaxRadius, 'cluster-map-max-radius')

const clusterMapClusterSpacing = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    clusterRadiusSpacing=100,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', clusterMapClusterSpacing, 'cluster-map-cluster-spacing')
