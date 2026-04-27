import { Selector } from 'testcafe'

import { checkTextboxes, downloadImage, getLocationWithoutSettings, screencap, target, urbanstatsFixture } from './test_utils'

urbanstatsFixture('special elections', '/article.html?longname=TN-07+%282023%29%2C+USA')

test('special elections', async (t) => {
    await checkTextboxes(t, ['Election'])
    await screencap(t)
})

urbanstatsFixture('collapsed pair of representatives', '/article.html?longname=02139%2C+USA')

test('collapsed pair of representatives', async (t) => {
    await checkTextboxes(t, ['Election'])
    await screencap(t)
})

const justRepresentatives = 'NA2DTaUCMnYKzp4HWm'

urbanstatsFixture('just representatives on 02139', `/article.html?longname=02139%2C+USA&s=${justRepresentatives}`)

test('just-02139-screencaps', async (t) => {
    await screencap(t)
    await downloadImage(t)
})

async function anchorsWithinSelectors(t: TestController, selector: Selector): Promise<[Selector, Selector]> {
    const anchors = selector.nth(0).find('a')
    await t.expect(anchors.count).eql(2)
    return [anchors.nth(0), anchors.nth(1)]
}

async function checkLinks(t: TestController, selector: Selector): Promise<(string | null)[]> {
    const [firstAnchor, secondAnchor] = await anchorsWithinSelectors(t, selector)
    const firstHref = await firstAnchor.getAttribute('href')
    const secondHref = await secondAnchor.getAttribute('href')
    return [firstHref, secondHref]
}

test('just-02139-other-parties', async (t) => {
    const appleton = Selector('span').withText(/William Appleton/)
    await t.scrollIntoView(appleton)
    await screencap(t)
    await t.expect(await checkLinks(t, appleton)).eql([
        'https://en.wikipedia.org/wiki/William_Appleton_(Massachusetts_politician)',
        'https://en.wikipedia.org/wiki/Constitutional_Union_Party',
    ])
})

test('just-02139-vacancy', async (t) => {
    const appleton = Selector('span').withText(/Vacant/)
    await t.scrollIntoView(appleton)
    await screencap(t)
})

const justRepresentatives2020 = 'NA2DTaKLXY9aDJpKdo'

urbanstatsFixture('just representatives on 02139', `/article.html?longname=02139%2C+USA&s=${justRepresentatives2020}`)

test('increase view size', async (t) => {
    await t.wait(1000)
    const scrollView = Selector('#congressional-representatives-scroll-view')
    await t.scrollIntoView(scrollView)
    // reliably resize the scroll view by setting its height directly
    await t.eval(() => {
        const el = document.getElementById('congressional-representatives-scroll-view')
        if (el) el.style.height = '700px'
    })
    await screencap(t)
    await downloadImage(t)
    await screencap(t)
    // check that the element's height is still 700px
    await t.expect(scrollView.getStyleProperty('height')).eql('700px')
})

urbanstatsFixture('check does not crash regression test', '/article.html?longname=02139%2C+USA&s=26oTpiy62xM4ioScvUR')

test('check does not crash regression test', async (t) => {
    await t.expect(Selector('span').withText(/Ayanna Pressley/).exists).ok()
})

urbanstatsFixture('5 zip comparison', `/comparison.html?longnames=%5B%2291101%2C+USA%22%2C%2291108%2C+USA%22%2C%2294709%2C+USA%22%2C%2202139%2C+USA%22%2C%2202138%2C+USA%22%5D&s=${justRepresentatives}`)

test('5 zip comparison', async (t) => {
    await screencap(t)
    await downloadImage(t)
})

urbanstatsFixture('hartford ct', `/article.html?longname=Hartford city%2C+Connecticut%2C+USA&s=${justRepresentatives}`)

test('in hartford ct larson appears once', async (t) => {
    const larson = Selector('a').withText(/Larson/)
    await t.expect(larson.count).eql(1)
    await screencap(t)
})

test('comparison page for ct-01', async (t) => {
    await t.click(Selector('a').withText(/CT-01/).nth(0))
    const shortnames = Selector('.subheadertext')
    await t.expect(shortnames.innerText).eql('CT-01 (2023) vs CT-01 (2013) vs CT-01 (2003) vs CT-01 (1993) vs CT-01 (1983) vs CT-01 (1973) vs CT-01 (1965)')
})

urbanstatsFixture('Maynard CDP', `/article.html?longname=Maynard+CDP%2C+Massachusetts%2C+USA&s=${justRepresentatives}`)

test('maynard cdps', async (t) => {
    await t.click(Selector('a').withText(/MA-05/).nth(0))
    const location = await getLocationWithoutSettings()
    await t.expect(location).eql(`${target}/article.html?longname=MA-05+%282023%29%2C+USA`)
})

urbanstatsFixture('stupid table', `/article.html?longname=Los+Angeles+city%2C+California%2C+USA&s=${justRepresentatives}`)

test('stupid table', async (t) => {
    await screencap(t)
    await downloadImage(t)
})

urbanstatsFixture('even stupider table', `/article.html?longname=New+York+Metropolitan+Cluster%2C+USA&s=${justRepresentatives}`)

test('even stupider table', async (t) => {
    await screencap(t)
    await downloadImage(t)
})

// Dark mode screenshot and download test
urbanstatsFixture('just representatives dark mode', `/article.html?longname=02139%2C+USA&s=${justRepresentatives}`)

test('just-02139-darkmode-screenshot-download', async (t) => {
    // Switch to dark mode
    await t.click(Selector('.theme-setting').find('select'))
        .click(Selector('option').withExactText('Dark Mode'))
    await screencap(t)
    await downloadImage(t)
})
