import { text } from 'stream/consumers'
import { createGunzip } from 'zlib'

import { Selector } from 'testcafe'

import { DefaultMap } from '../src/utils/DefaultMap'

import { pageDescriptorKind, target, urbanstatsFixture, waitForLoading } from './test_utils'

async function request(t: TestController, url: string): Promise<string> {
    const response = await t.request(url, { rawResponse: true, headers: { 'Accept-Encoding': 'gzip' } })
    return await text((response.body as IncomingMessage).pipe(createGunzip()))
}

export async function loadSitemap(t: TestController): Promise<string[]> {
    const robots = await request(t, `${target}/robots.txt`)
    const sitemapUrls = Array.from(robots.matchAll(/Sitemap: (.+)/g)).map(matches => matches[1])
    const sitemapsContents = await Promise.all(sitemapUrls.map(sitemapUrl => request(t, sitemapUrl.replaceAll('https://urbanstats.org', target))))
    const sitemapContents = sitemapsContents.flatMap(string => string.replaceAll('https://urbanstats.org', target).split('\n'))
    console.warn(`Sitemap has ${sitemapContents.length} entries`)
    return sitemapContents
}

// Each shard samples independently and then visits its share, so the number of pages
// visited per run stays the same as when this was one test.
export function visitSitemapLinks(shard: number, numShards: number): void {
    urbanstatsFixture(`sitemap links ${shard}`, target)

    test(`can visit sitemap links ${shard}`, async (t) => {
        // Visit at least 10 of each base url
        // Meant to be random so our test starts flaking if some links are bad

        const sitemap = await loadSitemap(t)
        const byBase = new DefaultMap<string, string[]>(() => [])
        for (const url of sitemap) {
            const base = url.split('?')[0]
            byBase.get(base).push(url)
        }

        const visitUrls: string[] = []
        const numToSample = 90
        for (const urls of byBase.values()) {
            for (let sampled = 0; sampled < numToSample && urls.length > 0; sampled++) {
                const index = Math.floor(Math.random() * urls.length)
                visitUrls.push(urls[index])
                urls.splice(index, 1)
            }
        }

        for (const [index, url] of visitUrls.entries()) {
            if (index % numShards !== shard) {
                continue
            }
            console.warn(url)
            await t.navigateTo(url)
            await waitForLoading()
            await t.expect(pageDescriptorKind()).notEql('error')
            await t.expect(Selector('[data-test-id=article-warning]').exists).notOk()
        }
    })
}
