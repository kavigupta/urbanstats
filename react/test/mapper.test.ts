import { checkGeojson, downloadPNG, getCodeFromMainField, getErrors, toggleCustomScript, urlFromCode } from './mapper-utils'
import { safeReload, screencap, urbanstatsFixture, downloadOrCheckString, downloadCSV } from './test_utils'

export function testCode(testFn: () => TestFn, geographyKind: string, universe: string, code: string, name: string, includeGeojson: boolean = false): void {
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
cMap(
    data=do { x = regr.residuals; x },
    scale=linearScale(max=0.1, center=0),
    ramp=rampUridis,
    label="Commute Transit above expectation based on ln(density) [%]",
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', codeFiltered, 'code-filtered')

const withOutline = `
cMap(
    data=density_pw_1km,
    scale=logScale(),
    ramp=rampUridis,
    outline=constructOutline(),
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', withOutline, 'with-outline')

const indiaEg = `
cMap(
    data=density_pw_1km,
    scale=logScale(),
    ramp=rampUridis,
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'India', indiaEg, 'india-eg')

const pointMap = `
pMap(data=hilliness, scale=linearScale(), ramp=rampUridis, basemap=noBasemap())
`

testCode(() => test, 'Urban Center', 'USA', pointMap, 'point-map')

const translucentOutline = `
cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    outline=constructOutline(
        color=rgb(0.8980392156862745, 0.12156862745098039, 0.12156862745098039, a=0.6),
        weight=10
    ),
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', translucentOutline, 'translucent-outline')

const codeWithRegression = `
regr = regression(y=commute_transit, x1=ln(density_pw_1km), weight=population);
condition (population > 200000)
cMap(
    data=regr.residuals,
    scale=linearScale(center=0, max=0.1),
    ramp=rampUridis,
    label="Commute Transit % above or below prediction based on density",
    basemap=noBasemap()
)
`

testCode(() => test, 'Urban Center', 'USA', codeWithRegression, 'code-with-regression', true)

const codeSetCenterWithExpression = `
cMap(
    data=arthritis,
    scale=linearScale(center=mean(arthritis)),
    ramp=rampUridis,
    unit=unitPercentage,
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', codeSetCenterWithExpression, 'code-set-center-with-expression', true)

const translucentOutlineCustomBackground = `
cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    outline=constructOutline(
        color=rgb(0.8980392156862745, 0.12156862745098039, 0.12156862745098039, a=0.6),
        weight=10
    ),
    basemap=noBasemap(backgroundColor=rgb(0.7, 0.3, 0.2, a=0.5))
)
`

testCode(() => test, 'County', 'USA', translucentOutlineCustomBackground, 'translucent-outline-custom-background')

const translucentOutlineCustomBackgroundAndTextColor = `
cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    outline=constructOutline(
        color=rgb(0.8980392156862745, 0.12156862745098039, 0.12156862745098039, a=0.6),
        weight=10
    ),
    basemap=noBasemap(backgroundColor=rgb(0.7, 0.3, 0.2, a=0.5), textColor=rgb(1, 1, 1))
)
`

testCode(() => test, 'County', 'USA', translucentOutlineCustomBackgroundAndTextColor, 'translucent-outline-custom-background-and-text-color')

const rgbMap = `
cMapRGB(
    dataR=commute_car,
    dataG=commute_transit,
    dataB=commute_walk,
    label="RGB Map: Density (R), Transit (G), Walk (B)",
    basemap=noBasemap()
)
`

testCode(() => test, 'County', 'USA', rgbMap, 'rgb-map')

// CSV Export Test
urbanstatsFixture('mapper-csv-export', urlFromCode('County', 'USA', 'condition(population > 100000); cMap(data=density_pw_1km / population, scale=logScale(), ramp=rampUridis, basemap=noBasemap())'))

test('mapper-csv-export', async (t) => {
    const csvContent = await downloadCSV(t)
    await downloadOrCheckString(t, csvContent, 'csv-export-mapper', 'csv', false)
})

testCode(() => test, 'Subnational Region', 'USA', `cMap(
    data=density_pw_1km,
    scale=linearScale(),
    ramp=rampUridis,
    label="Multiline\\nLabel",
    basemap=noBasemap()
)`, 'multiline-label')

const negativeDefaultValue = `
condition (white > 0.7 & density_pw_1km < 1000)
cMap(
    data=pres_2020_margin,
    scale=linearScale(max=0, min=-0.75),
    ramp=rampUridis,
    basemap=noBasemap(backgroundColor=colorBlack),
    label="2020 Presidential Election Margin, among CCDs with 70%+ white and Density < 1000/km2",
    unit=unitDemocraticMargin
)`

testCode(() => test, 'County', 'USA', negativeDefaultValue, 'negative-default-value', true)
