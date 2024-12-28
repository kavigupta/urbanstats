import { ClientFunction } from 'testcafe'

import { DefaultMap } from '../src/utils/DefaultMap'

import { pageDescriptorKind, target, urbanstatsFixture, waitForPageLoaded } from './test_utils'

urbanstatsFixture('home page', target)

async function loadSitemap(t: TestController): Promise<string[]> {
    const robots = (await t.request(`${target}/robots.txt`)).body.valueOf() as string
    const sitemapUrls = Array.from(robots.matchAll(/Sitemap: (.+)/g)).map(matches => matches[1])
    const sitemapResponses = await Promise.all(sitemapUrls.map(sitemapUrl => t.request(sitemapUrl.replaceAll('https://urbanstats.org', target))))
    const sitemapContents = sitemapResponses.flatMap((response) => {
        const text = response.body.valueOf() as string
        return text.replaceAll('https://urbanstats.org', target).split('\n')
    })
    return sitemapContents
}

test('sitemap contains all links in sidebar', async (t) => {
    const sidebarLinks = await ClientFunction(() => Array.from(document.querySelectorAll('.left_panel a[href]')).map(link => link.getAttribute('href')!))()
    const sitemap = await loadSitemap(t)
    const missingFromSitemap = sidebarLinks.filter(link => !sitemap.includes(link))
    await t.expect(missingFromSitemap).eql([])
})

test('can visit sitemap links', async (t) => {
    // Visit at least 10 of each base url
    // Meant to be random so our test starts flaking if some links are bad

    const sitemap = await loadSitemap(t)
    const byBase = new DefaultMap<string, string[]>(() => [])
    for (const url of sitemap) {
        const base = url.split('?')[0]
        byBase.get(base).push(url)
    }

    const visitUrls: string[] = []
    for (const urls of byBase.values()) {
        for (let sampled = 0; sampled < 10 && urls.length > 0; sampled++) {
            const index = Math.floor(Math.random() * urls.length)
            visitUrls.push(urls[index])
            urls.splice(index, 1)
        }
    }

    for (const url of visitUrls) {
        await t.navigateTo(url)
        await waitForPageLoaded(t)
        await t.expect(pageDescriptorKind()).notEql('error')
    }
})
