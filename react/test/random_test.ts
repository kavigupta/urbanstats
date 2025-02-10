import { target, getLocation, urbanstatsFixture } from './test_utils'

const repeats = 50

async function assertIsArticle(t: TestController): Promise<void> {
    await t.expect(await getLocation()).contains('/article.html?longname=')
}

async function assertNoSetUniverse(t: TestController): Promise<void> {
    await t.expect(await getLocation()).notContains('&universe=')
}

async function assertNoSpecials(t: TestController): Promise<void> {
    const location = await getLocation()
    await t.expect(location).notMatch(/.*Historical Congressional.*/)
}

async function assertCorrect(t: TestController): Promise<void> {
    await t.wait(1000)
    console.warn(`location: ${await getLocation()}`)
    await assertIsArticle(t)
    await assertNoSetUniverse(t)
    await assertNoSpecials(t)
}

urbanstatsFixture('random-usa-by-population', `${target}/random.html?sampleby=population&us_only=true`)

for (let count = 0; count < repeats; count++) {
    test(`random-usa-by-population-${count}`, async (t) => {
        await assertCorrect(t)
        await t.expect(await getLocation()).match(/.*USA.*/)
    })
}

urbanstatsFixture('random-uniformly', `${target}/random.html?sampleby=uniform`)

for (let count = 0; count < repeats; count++) {
    test(`random-usa-by-population-${count}`, async (t) => {
        await assertCorrect(t)
    })
}

urbanstatsFixture('random-by-population', `${target}/random.html?sampleby=population`)

for (let count = 0; count < repeats; count++) {
    test(`random-by-population-${count}`, async (t) => {
        await assertCorrect(t)
    })
}
