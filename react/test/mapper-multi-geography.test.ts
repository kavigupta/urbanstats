import fs from 'fs/promises'
import { gzipSync } from 'zlib'

import { Selector } from 'testcafe'

import { getErrors, settingsFromURL } from './mapper-utils'
import { tempfileName } from './quiz_test_utils'
import { getLocation, screencap, target, urbanstatsFixture, waitForDownload, waitForLoading } from './test_utils'

const code = 'cMap(data=population, scale=linearScale(), ramp=rampUridis, basemap=noBasemap())'

function url(settings: object): string {
    return `${target}/mapper.html?settings=${encodeURIComponent(gzipSync(JSON.stringify({ ...settings, script: { uss: code } })).toString('base64'))}`
}

function geographies(...universes: string[]): { universe: string, geographyKind: string }[] {
    return universes.map(universe => ({ universe, geographyKind: 'Subnational Region' }))
}

function rowInput(row: number, which: 0 | 1): Selector {
    return Selector('[data-test-id=test-geography-row]').nth(row).find('input')
        .nth(which)
}

async function settingsGeographies(): Promise<unknown> {
    return (settingsFromURL(await getLocation()) as { geographies: unknown }).geographies
}

urbanstatsFixture('far apart geographies', url({ geographies: geographies('USA', 'France') }))

// Too far apart to share a map, so each gets one, and each keeps its insets over its own half.
test('far apart geographies', async (t) => {
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: false })
})

urbanstatsFixture('neighbouring geographies', url({ geographies: geographies('USA', 'Canada') }))

// Neighbours share one map, and the USA's insets stay over the part of it the USA covers.
test('neighbouring geographies', async (t) => {
    await t.expect(getErrors()).eql([])
    await screencap(t, { removeEntireMap: false })
})

urbanstatsFixture('the header keeps a universe only while there is one', url({ geographies: geographies('USA') }))

test('the header keeps a universe only while there is one', async (t) => {
    const universeFlag = Selector('button').withAttribute('aria-label', 'Switch Universes')
    await t.expect(universeFlag.exists).ok()
    await t.click(Selector('[data-test-id=test-add-geography-button]'))
    await t.expect(universeFlag.exists).notOk()
})

urbanstatsFixture('adding and removing geographies', url({ geographies: geographies('USA') }))

test('adding and removing geographies', async (t) => {
    await t.click(Selector('[data-test-id=test-add-geography-button]'))
    await t.expect(rowInput(1, 0).value).eql('USA')

    const universe = rowInput(1, 0)
    await t.click(universe).selectText(universe).typeText(universe, 'France').pressKey('enter')
    await t.expect(rowInput(1, 0).value).eql('France')
    await t.expect(await settingsGeographies()).eql(geographies('USA', 'France'))
    await waitForLoading()
    await t.expect(getErrors()).eql([])

    await t.click(Selector('[data-test-id=test-remove-geography-button]').nth(0))
    await t.expect(await settingsGeographies()).eql(geographies('France'))
})

const metaLine = 'meta(kind="mapper", universe=["USA", "France"], geographyKind=["Subnational Region", "Subnational Region"])'

urbanstatsFixture('export several geographies', url({ geographies: geographies('USA', 'France') }))

test('export several geographies', async (t) => {
    const laterThan = new Date().getTime()
    await t.click(Selector('button').withExactText('Export Script'))
    const exported = await fs.readFile(await waitForDownload(t, laterThan, '.uss'), 'utf-8')
    await t.expect(exported.split('\n')[0]).eql(metaLine)
})

urbanstatsFixture('import several geographies', url({ geographies: geographies('Iceland') }))

test('import several geographies', async (t) => {
    const tempfile = `${tempfileName()}.uss`
    await fs.writeFile(tempfile, `${metaLine}\n${code}`)
    await t.click(Selector('button').withExactText('Import Script'))
    await t.setFilesToUpload('input[type=file]', [tempfile])
    await t.expect(await settingsGeographies()).eql(geographies('USA', 'France'))
})

// The form every link made before a map could span several geographies is in.
urbanstatsFixture('a link naming its geography as scalars', url({ universe: 'USA', geographyKind: 'Urban Area' }))

test('a link naming its geography as scalars', async (t) => {
    await t.expect(Selector('[data-test-id=test-geography-row]').count).eql(1)
    await t.expect(rowInput(0, 0).value).eql('USA')
    await t.expect(rowInput(0, 1).value).eql('Urban Area')
    await t.expect(getErrors()).eql([])
})
