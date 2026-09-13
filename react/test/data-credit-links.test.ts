import { ClientFunction, Selector } from 'testcafe'

import { colorThemes } from '../src/page_template/color-themes'

import { getLocation, screencap, target, urbanstatsFixture, waitForLoading } from './test_utils'

// A space in the type name is what exercises the percent-encoding round trip between href and element id
const typeWithSpace = 'Urban Center'

const highlight = colorThemes['Light Mode'].highlight

const shapefileRow = ClientFunction((name: string) => {
    const row = document.getElementById(`shapefile_${name}`)?.parentElement
    if (row === null || row === undefined) {
        return null
    }
    const [r, g, b] = getComputedStyle(row).backgroundColor.match(/\d+/g)!.map(Number)
    return {
        viewportTop: Math.round(row.getBoundingClientRect().top),
        background: `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`,
    }
})

urbanstatsFixture('article map attribution', `${target}/article.html?longname=Boston+Urban+Center%2C+USA`)

test('map attribution links to the shapefile row', async (t) => {
    const link = Selector('a').withExactText(`What is a ${typeWithSpace}?`)
    await t.expect(link.getAttribute('href')).eql(`${target}/data-credit.html#shapefile_Urban%20Center`)
    await t.expect(link.getAttribute('target')).eql('_blank')
    await t.click(link)
    await waitForLoading()
    await t.expect(getLocation()).eql(`${target}/data-credit.html#shapefile_Urban%20Center`)
    await t.expect(shapefileRow(typeWithSpace)).eql({ viewportTop: 0, background: highlight })
    await screencap(t, { fullPage: false })
})

urbanstatsFixture('shapefile anchor', `${target}/data-credit.html`)

test('an unanchored shapefile row is not highlighted', async (t) => {
    await t.expect((await shapefileRow(typeWithSpace))!.background).notEql(highlight)
})
