import fs from 'fs'

import { Selector } from 'testcafe'

import { target, downloadOrCheckString, mostRecentDownloadPath, screencap, urbanstatsFixture } from './test_utils'

async function checkGeojson(t: TestController, path: string): Promise<void> {
    // download the geojson by clicking the button
    await t.click(Selector('button').withExactText('Export as GeoJSON'))
    await t.wait(1000) // sometimes downloading takes a little time
    const mrdp = mostRecentDownloadPath()
    const mostRecentDownload = fs.readFileSync(mrdp, 'utf8')
    await downloadOrCheckString(t, mostRecentDownload, path, 'json')
}

urbanstatsFixture('mapping', `${target}/mapper.html?settings=H4sIAAAAAAAAA1WOzQ6CQAyEX8XUeCOGixeO%2BggejSEFy7Kh%2B5PdRSWEd7dLjMHe2plvpjMociqg76d60PYBFVwTJoICOs2JAlQzkMWGSbQOOZIoo22TdjZrafIk0O9UwBODzv4I1e2%2BLAW0jl2oo8RugKitYlrtPObDmbEddgcQIKDxGytrSxjgG2Rwq%2FlAkZJoFk3eL2NDPbF%2BQ27OpBRPUiTIiotnX64j0Iu06uWr8ngSd4OR%2FtNdNJLzAd2YY7skAQAA`)

test('state-map', async (t) => {
    await screencap(t)
    await checkGeojson(t, 'state-map-geojson')
})

urbanstatsFixture('mapping-more-complex', `${target}/mapper.html?settings=H4sIAAAAAAAAA5WSwW6DMAyGXwV5l3ZqJ8ax10o797DbVCFDDUQLSeSErqjqu88BRpm0wyokhH7bn3%2FbXKEmWzO6ps8%2FlTnBDva2M6GHDVRKB2LYXYEMFpokWKH2JJHOlEFZE2OhdyRVs3S7baC02nLuA4a%2FMjZwRt1F6W0psYpNPOw%2BrmCwjfGLBOjieEHxytSaFoyDdZ3GSEn2DZqaklWWvqbbLM3SdXQz09xjtAETCcexjLwfRgZKtsnqkjwnbi2VE7xR8s1UT2njGLJQciQvE%2F7XFGR5c8nIeMDpcVhjLhbUacgZ8zlXRg5ZkhMXUExaaamqVKmmRtCClH%2BRqpuQF33u7p7Gq9%2BO4o2xdYtJtDKEDNPBW1zG4sIo3Bf0TsyohgmZzsQ%2B%2Fk%2BBOxIhcuR36WVAAQwwqXgq0vjAjy2R0pcsAgr09Lub9a1c6htvmskEzgIAAA%3D%3D`)

test('mapping-more-complex', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
    await checkGeojson(t, 'mapping-more-complex-geojson')
})

urbanstatsFixture('mapping-with-regression', `${target}/mapper.html?settings=H4sIAAAAAAAAA52TwW7CMAyGX6XyLiCxCSa4VNqFoe067bLDhKK0dUtEmkRJOlZVvPucttCCdhjrLf7tz3byt4ECdWG52dVsL1QGMTzrSvkaZpAL6dFC3AAqnkgkMefSISmVSr3QKmi%2BNkhV59AMvrisQuhlCOG3sehcWwJtihUB6SD%2B3B6PM0i11JY5z%2F2fmWNGA4qXQd8s%2B24jjBOqkDiCvH1EG1RO%2BDqa2KflvpwCzTAwHlfzmylU02K2V8uicVTTk9%2Bx6JUIrdU20nlEqj2Hu10yNKgyVL473nwb1zNIXUzCUtNhEgiDUg2jLJG1sG7SEBOK3j1F48%2BPxVKNeS5S0Q8FJVsAEQ4oip1nSc2MNpXknSl6l5CdTov861F%2FXWN5scRxS96xvDSjBildo%2BfUs3dVycdq4KEfGGu7fgWCSH1AyxLyfvgH7heUURkzCi3aLKGQXFqTEQjZ4km6m7cfnO4D4vnDirIT7vCyu3YlDf0DcHWWOnUDAAA%3D`)

test('mapping-with-regression', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
    await checkGeojson(t, 'mapping-with-regression-geojson')
})
