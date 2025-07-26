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

urbanstatsFixture('mapping', `${target}/mapper.html?settings=H4sIAAAAAAAAA4WQwUrEMBCGX2UZ2VuRvXjpUcGroEeRZVpn07DTpGQSd8uSd3emiK0nc0ryf%2F83ITdwFF3CaZiPZx8%2BoYW30gXMPgbk3Ss53UADJ8%2BZErQ3oIAdk4InZCFNSuiNtizPE6nh96qBL0zeeIH2%2FcOOXIx4Xgm6TolEFgNArQ30kWM6Ssa8cYoPjglWxSNjf97tQQsJx2mDsg%2BECX5EI24zm0VZs4CjnZ9KRwOxvy6TramDZx2klaWuzN1hWVq6kHeDvupw%2F6B0h0J%2F7VFGpWT9wJeSzSn%2F6Gqt3%2Bx7oSqJAQAA`)

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

urbanstatsFixture('mapping-with-regression', `${target}/mapper.html?settings=H4sIAAAAAAAAA52TTUvDQBCG%2F0oYLy1UaaW9BDxZvCoieJASNskkXbrZXXY31lDy353dpE1aBK29Zd6ZZz727QFKVKVhetskOy5ziOFR1dI1MIOCC4cG4gOgZKlAEgsmLJJSy8xxJb3mGo1UdQrN4JOJ2oeehhB%2BaYPWhhIIKYZ7pIX4Y9O2M8iUUCaxjrk%2FM8eMA0hWeX297LuNMJbLUuAI8vIerVFa7ppoYh6Wu2oKNMPAuF%2FNr6ZQTcBsLpZFbammJ79i2SsRGqNMpIqIVHMKd7vkqFHmKF33efU1LmcQqpz4pabDJOAHpZqEsngeYN2kPsYlvXuG2p0eK8kUFgXPeD8UVMkCiLBHXm5dkjaJVroWrDNF7xKy03GRfz3qj2ssz5ZoN%2BQdwyo9apDRGR2jnr2rKjZWPQ%2FdwHijh2BcAnGE2qNJUrK%2F%2FxvcLiip1noUWoQsLpGM2pAXiBo6kHQzDz84ngTi%2Bd2KslNm8XwAZSvKsnUqw7WYeK6dZ9pfcG3bfgPW1didrQMAAA%3D%3D`)

test('mapping-with-regression', async (t) => {
    await t.resizeWindow(1400, 800)
    await screencap(t)
    await checkGeojson(t, 'mapping-with-regression-geojson')
})
