import { gunzipSync } from 'zlib'

import { ClientFunction, Selector } from 'testcafe'

import { DefaultMap } from '../src/utils/DefaultMap'

import { pageDescriptorKind, target, urbanstatsFixture, waitForPageLoaded } from './test_utils'

urbanstatsFixture('home page', target)

async function loadSitemap(t: TestController): Promise<string[]> {
    const robots = (await t.request(`${target}/robots.txt`)).body.valueOf() as string
    const sitemapUrls = Array.from(robots.matchAll(/Sitemap: (.+)/g)).map(matches => matches[1])
    const sitemapsContents = await Promise.all(sitemapUrls.map(async (sitemapUrl) => {
        const response = await t.request(sitemapUrl.replaceAll('https://urbanstats.org', target))
        const body = await response.body as Buffer
        return gunzipSync(body).toString()
    }))
    const sitemapContents = sitemapsContents.flatMap((text) => {
        return text.replaceAll('https://urbanstats.org', target).split('\n')
    })
    return sitemapContents
}

test('sitemap contains all links in sidebar', async (t) => {
    const sidebarLinksWithoutTarget = await ClientFunction(() => Array.from(document.querySelectorAll('.left_panel a[href]')).map(link => link.getAttribute('href')!))()
    const remap = (link: string): string => link === '/' ? target : target + link
    const sidebarLinks = sidebarLinksWithoutTarget.map(remap)
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
    const numToSample = 100
    for (const urls of byBase.values()) {
        for (let sampled = 0; sampled < numToSample && urls.length > 0; sampled++) {
            const index = Math.floor(Math.random() * urls.length)
            visitUrls.push(urls[index])
            urls.splice(index, 1)
        }
    }

    for (const url of visitUrls) {
        // eslint-disable-next-line no-console -- So we can see where it fails
        console.log(url)
        await t.navigateTo(url)
        await waitForPageLoaded(t)
        await t.expect(pageDescriptorKind()).notEql('error')
        await t.expect(Selector('[data-test-id=article-warnings]').exists).notOk()
    }
})
