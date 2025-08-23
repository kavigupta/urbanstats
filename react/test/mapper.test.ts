import { checkGeojson, downloadPNG, getCodeFromMainField, getErrors, toggleCustomScript, urlFromCode } from './mapper-utils'
import { screencap, urbanstatsFixture } from './test_utils'

export function testCode(geographyKind: string, universe: string, code: string, name: string, includeGeojson: boolean = false): void {
    const url = urlFromCode(geographyKind, universe, code)
    urbanstatsFixture(name, url)

    test(name, async (t) => {
        await t.expect(code.trim()).eql((await getCodeFromMainField()).trim())
        await t.expect(await getErrors()).eql([])
        await toggleCustomScript(t)
        await t.expect(await getErrors()).eql([])
        await toggleCustomScript(t)
        await t.expect(await getErrors()).eql([])
        await t.expect(code.trim()).eql((await getCodeFromMainField()).trim())
        await screencap(t)
        if (includeGeojson) {
            await checkGeojson(t, `mapping-geojson-${name}`)
        }
        await downloadPNG(t)
    })
}

const codeFiltered = `
regr = regression(y=commute_transit, x1=ln(density_pw_1km), weight=population);
condition (population > 10000)
cMap(data=do { x = regr.residuals; x }, scale=linearScale(max=0.1, center=0), ramp=rampUridis, label="Commute Transit above expectation based on ln(density) [%]", basemap=noBasemap())
`

testCode('County', 'USA', codeFiltered, 'code-filtered')

const withOutline = `
cMap(data=density_pw_1km, scale=logScale(), ramp=rampUridis, outline=constructOutline(), basemap=noBasemap())
`

testCode('County', 'USA', withOutline, 'with-outline')

const indiaEg = `
cMap(data=density_pw_1km, scale=logScale(), ramp=rampUridis, basemap=noBasemap())
`

testCode('Subnational Region', 'India', indiaEg, 'india-eg')

const pointMap = `
pMap(data=hilliness, scale=linearScale(), ramp=rampUridis, basemap=noBasemap())
`

testCode('Urban Center', 'USA', pointMap, 'point-map')

const translucentOutline = `
cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, outline=constructOutline(color=rgb(0.8980392156862745, 0.12156862745098039, 0.12156862745098039, a=0.6), weight=10), basemap=noBasemap())
`

testCode('Subnational Region', 'USA', translucentOutline, 'translucent-outline')

const codeWithRegression = `
regr = regression(y=commute_transit, x1=ln(density_pw_1km), weight=population);
condition (population > 200000)
cMap(data=regr.residuals, scale=linearScale(center=0, max=0.1), ramp=rampUridis, label="Commute Transit %  above or below prediction based on density", basemap=noBasemap())
`

testCode('Subnational Region', 'USA', codeWithRegression, 'code-with-regression', true)

const codeSetCenterWithExpression = `
cMap(data=arthritis, scale=linearScale(center=mean(arthritis)), ramp=rampUridis, unit=unitPercentage, basemap=noBasemap())
`

testCode('County', 'USA', codeSetCenterWithExpression, 'code-set-center-with-expression', true)
