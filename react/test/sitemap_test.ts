import { text } from 'stream/consumers'
import { createGunzip } from 'zlib'

import { ClientFunction, Selector } from 'testcafe'

import { DefaultMap } from '../src/utils/DefaultMap'

import { pageDescriptorKind, target, urbanstatsFixture, waitForPageLoaded } from './test_utils'

urbanstatsFixture('home page', target)

async function request(t: TestController, url: string): Promise<string> {
    const response = await t.request(url, { rawResponse: true, headers: { 'Accept-Encoding': 'gzip' } })
    return await text((response.body as IncomingMessage).pipe(createGunzip()))
}

async function loadSitemap(t: TestController): Promise<string[]> {
    const robots = await request(t, `${target}/robots.txt`)
    const sitemapUrls = Array.from(robots.matchAll(/Sitemap: (.+)/g)).map(matches => matches[1])
    const sitemapsContents = await Promise.all(sitemapUrls.map(sitemapUrl => request(t, sitemapUrl.replaceAll('https://urbanstats.org', target))))
    const sitemapContents = sitemapsContents.flatMap(string => string.replaceAll('https://urbanstats.org', target).split('\n'))
    console.warn(`Sitemap has ${sitemapContents.length} entries`)
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
        console.warn(url)
        await t.navigateTo(url)
        await waitForPageLoaded(t)
        await t.expect(pageDescriptorKind()).notEql('error')
        await t.expect(Selector('[data-test-id=article-warnings]').exists).notOk()
    }
})
