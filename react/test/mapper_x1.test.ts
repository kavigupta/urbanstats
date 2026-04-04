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

testCode(() => test, 'Urban Center', 'USA', clusterMapBasic, 'cluster-map-basic')

const clusterMapWeightedByArea = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    relativeArea=area,
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', clusterMapWeightedByArea, 'cluster-map-weight-by-area')

const clusterMapRampBone = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampBone,
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', clusterMapRampBone, 'cluster-map-ramp-bone')

const clusterMapRampViridis = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampViridis,
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', clusterMapRampViridis, 'cluster-map-ramp-viridis')

const clusterMapOpacity = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    opacity=0.45,
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', clusterMapOpacity, 'cluster-map-opacity')

const clusterMapMaxRadius = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    maxRadius=26,
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', clusterMapMaxRadius, 'cluster-map-max-radius')

const clusterMapClusterSpacing = `
clusterMap(
    data=hilliness,
    scale=linearScale(),
    ramp=rampUridis,
    clusterRadiusSpacing=22,
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', clusterMapClusterSpacing, 'cluster-map-cluster-spacing')
