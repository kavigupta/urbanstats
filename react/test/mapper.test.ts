import fs from 'fs'

import { Selector } from 'testcafe'

import { target, downloadOrCheckString, waitForDownload, screencap, urbanstatsFixture, grabDownload } from './test_utils'

async function checkGeojson(t: TestController, path: string): Promise<void> {
    const laterThan = new Date().getTime()
    // download the geojson by clicking the button
    await t.click(Selector('button').withExactText('Export as GeoJSON'))
    await t.wait(1000) // sometimes downloading takes a little time
    const mrdp = await waitForDownload(t, laterThan)
    const mostRecentDownload = fs.readFileSync(mrdp, 'utf8')
    await downloadOrCheckString(t, mostRecentDownload, path, 'json')
}

export async function downloadPNG(t: TestController): Promise<void> {
    const download = Selector('button').withExactText('Export as PNG')
    await grabDownload(t, download) // wait for 6 seconds to ensure the download completes
}

export async function clickOSMCheckbox(t: TestController): Promise<void> {
    const osmCheckbox = Selector('div').withText(/^OSM:/).parent().find('input[type="checkbox"]')
    await t.click(osmCheckbox)
}

urbanstatsFixture('mapping', `${target}/mapper.html?settings=H4sIAAAAAAAAA4WQwUrEMBCGX2UZ2VuRvXjpUcGroEeRZVpn07DTpGQSd8uSd3emiK0nc0ryf%2F83ITdwFF3CaZiPZx8%2BoYW30gXMPgbk3Ss53UADJ8%2BZErQ3oIAdk4InZCFNSuiNtizPE6nh96qBL0zeeIH2%2FcOOXIx4Xgm6TolEFgNArQ30kWM6Ssa8cYoPjglWxSNjf97tQQsJx2mDsg%2BECX5EI24zm0VZs4CjnZ9KRwOxvy6TramDZx2klaWuzN1hWVq6kHeDvupw%2F6B0h0J%2F7VFGpWT9wJeSzSn%2F6Gqt3%2Bx7oSqJAQAA`)

test('state-map', async (t) => {
    await screencap(t)
    await checkGeojson(t, 'state-map-geojson')
    await clickOSMCheckbox(t)
    await downloadPNG(t)
})

urbanstatsFixture('mapping-more-complex', `${target}/mapper.html?settings=H4sIAAAAAAAAA5WSwW6DMAyGXwV5l3ZqJ8ax10o797DbVCFDDUQLSeSErqjqu88BRpm0wyokhH7bn3%2FbXKEmWzO6ps8%2FlTnBDva2M6GHDVRKB2LYXYEMFpokWKH2JJHOlEFZE2OhdyRVs3S7baC02nLuA4a%2FMjZwRt1F6W0psYpNPOw%2BrmCwjfGLBOjieEHxytSaFoyDdZ3GSEn2DZqaklWWvqbbLM3SdXQz09xjtAETCcexjLwfRgZKtsnqkjwnbi2VE7xR8s1UT2njGLJQciQvE%2F7XFGR5c8nIeMDpcVhjLhbUacgZ8zlXRg5ZkhMXUExaaamqVKmmRtCClH%2BRqpuQF33u7p7Gq9%2BO4o2xdYtJtDKEDNPBW1zG4sIo3Bf0TsyohgmZzsQ%2B%2Fk%2BBOxIhcuR36WVAAQwwqXgq0vjAjy2R0pcsAgr09Lub9a1c6htvmskEzgIAAA%3D%3D`)

test('mapping-more-complex', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
    await checkGeojson(t, 'mapping-more-complex-geojson')
    await clickOSMCheckbox(t)
    await downloadPNG(t)
})

urbanstatsFixture('mapping-with-regression', `${target}/mapper.html?settings=H4sIAAAAAAAAA52TwW7CMAyGX6XyLiCxCSa4VNqFoe067bLDhKK0dUtEmkRJOlZVvPucttCCdhjrLf7tz3byt4ECdWG52dVsL1QGMTzrSvkaZpAL6dFC3AAqnkgkMefSISmVSr3QKmi%2BNkhV59AMvrisQuhlCOG3sehcWwJtihUB6SD%2B3B6PM0i11JY5z%2F2fmWNGA4qXQd8s%2B24jjBOqkDiCvH1EG1RO%2BDqa2KflvpwCzTAwHlfzmylU02K2V8uicVTTk9%2Bx6JUIrdU20nlEqj2Hu10yNKgyVL473nwb1zNIXUzCUtNhEgiDUg2jLJG1sG7SEBOK3j1F48%2BPxVKNeS5S0Q8FJVsAEQ4oip1nSc2MNpXknSl6l5CdTov861F%2FXWN5scRxS96xvDSjBildo%2BfUs3dVycdq4KEfGGu7fgWCSH1AyxLyfvgH7heUURkzCi3aLKGQXFqTEQjZ4km6m7cfnO4D4vnDirIT7vCyu3YlDf0DcHWWOnUDAAA%3D`)

test('mapping-with-regression', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
    await checkGeojson(t, 'mapping-with-regression-geojson')
    await clickOSMCheckbox(t)
    await downloadPNG(t)
})
