import { Selector } from 'testcafe'

import { target, comparisonPage, downloadImage, screencap, urbanstatsFixture, waitForSelectedSearchResult } from './test_utils'

urbanstatsFixture('transpose comparision', `${target}/comparison.html?longnames=%5B%22China%22%2C%22USA%22%2C%22Japan%22%2C%22Indonesia%22%5D&s=6TunChiToWxwZeDP`)

test('renders transpose comparision', async (t) => {
    await screencap(t)
})

test('transpose screencap', async (t) => {
    await downloadImage(t)
})

urbanstatsFixture('scrolling transpose comparison', `${target}/comparison.html?longnames=%5B"Santa+Clarita+city%2C+California%2C+USA"%2C"Santa+Clara+city%2C+California%2C+USA"%2C"Boston+city%2C+Massachusetts%2C+USA"%2C"San+Francisco+city%2C+California%2C+USA"%2C"Denver+city%2C+Colorado%2C+USA"%5D&s=8gkGqBdgQkNpHJZ`)

test('renders scrolling transpose comparision', async (t) => {
    await screencap(t)
})

urbanstatsFixture('mobile transpose', `${target}/comparison.html?longnames=%5B%22California%2C+USA%22%2C%22Texas%2C+USA%22%2C%22Florida%2C+USA%22%5D&s=2EoPvra9nrE8zYq`, async (t) => {
    await t.resizeWindow(400, 800)
})

test('renders mobile transpose correctly', async (t) => {
    await screencap(t)
})

test('mobile transpose screencap', async (t) => {
    await downloadImage(t)
})

urbanstatsFixture('transpose with duplicate', `${target}/comparison.html?longnames=%5B%22California%2C+USA%22%2C%22Texas%2C+USA%22%2C%22Florida%2C+USA%22%2C%22Texas%2C+USA%22%5D&s=k32AgBaBU3tCGR`)

test('removing duplicate does not glitch out', async (t) => {
    await t.click(Selector('.manipulation-button-delete').nth(3))
    await screencap(t)
})

urbanstatsFixture('comparison add many cities', comparisonPage(['Los Angeles city, California, USA']))

for (const platform of ['desktop', 'mobile']) {
    test(`comparison-add-many-cities-${platform}`, async (t) => {
        if (platform === 'mobile') {
            await t.resizeWindow(400, 800)
        }

        await screencap(t)

        const citiesToAdd = [
            'New York city, New York, USA',
            'Denver city, Colorado, USA',
            'Anchorage municipality, Alaska, USA',
            'Houston city, Texas, USA',
            'Miami city, Florida, USA',
            'Chicago city, Illinois, USA',
        ]
        for (const city of citiesToAdd) {
            const input = Selector('input').withAttribute('placeholder', 'Name')
            await t
                .click(input)
                .typeText(input, city)
            await waitForSelectedSearchResult(t)
            await t.pressKey('enter')
            await screencap(t)
            await downloadImage(t)
        }
    })
}
