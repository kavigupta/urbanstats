import fs from 'fs'
import { gzipSync } from 'zlib'

import { Selector } from 'testcafe'

import { target, downloadOrCheckString, mostRecentDownloadPath, screencap, urbanstatsFixture, grabDownload, waitForLoading } from './test_utils'

async function checkGeojson(t: TestController, path: string): Promise<void> {
    // download the geojson by clicking the button
    await t.click(Selector('button').withExactText('Export as GeoJSON'))
    await t.wait(1000) // sometimes downloading takes a little time
    const mrdp = mostRecentDownloadPath()
    const mostRecentDownload = fs.readFileSync(mrdp, 'utf8')
    await downloadOrCheckString(t, mostRecentDownload, path, 'json')
}

export async function downloadPNG(t: TestController): Promise<void> {
    const download = Selector('button').withExactText('Export as PNG')
    await grabDownload(t, download, 6000) // wait for 6 seconds to ensure the download completes
}

export async function toggleCustomScript(t: TestController): Promise<void> {
    const checkbox = Selector('div').withText(/^Enable custom script/).parent().find('input[type="checkbox"]')
    await t.click(checkbox)
    await waitForLoading(t)
}

export function urlFromCode(geographyKind: string, universe: string, code: string): string {
    const settingsJSON = JSON.stringify({
        geographyKind,
        universe,
        script: {
            uss: code,
        },
    })
    const url = `${target}/mapper.html?settings=${encodeURIComponent(gzipSync(settingsJSON).toString('base64'))}`
    // eslint-disable-next-line no-console -- helpful for debugging the test
    console.log('url', url)
    return url
}

export async function getCodeFromMainField(): Promise<string> {
    // id = test-editor-body
    const mainField = Selector('#test-editor-body')
    const code = await mainField.textContent
    return code
}

export async function getErrors(): Promise<string[]> {
    // all divs with id = test-editor-result
    const errorSelector = Selector('#test-editor-result')
    const errors: string[] = []
    for (let i = 0; i < await errorSelector.count; i++) {
        const errorText = await errorSelector.nth(i).textContent
        if (errorText) {
            errors.push(errorText)
        }
    }
    return errors
}

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
cMap(data=density_pw_1km, scale=logScale(), ramp=rampUridis, outline=constructOutline())
`

testCode('County', 'USA', withOutline, 'with-outline')

const indiaEg = `
cMap(data=density_pw_1km, scale=logScale(), ramp=rampUridis)
`

testCode('Subnational Region', 'India', indiaEg, 'india-eg')

const pointMap = `
pMap(data=hilliness, scale=linearScale(), ramp=rampUridis)
`

testCode('Urban Center', 'USA', pointMap, 'point-map')

const translucentOutline = `
cMap(data=density_pw_1km, scale=linearScale(), ramp=rampUridis, outline=constructOutline(color=rgb(0.8980392156862745, 0.12156862745098039, 0.12156862745098039, a=0.6), weight=10))
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
