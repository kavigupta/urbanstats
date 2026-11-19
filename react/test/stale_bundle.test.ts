import { Selector } from 'testcafe'

import { pageDescriptorKind, urbanstatsFixture, withInterceptedRequests } from './test_utils'

urbanstatsFixture('stale bundle', '/', async (t) => {
    // Chunks served from the browser cache never reach the interceptor
    await (await t.getCurrentCDPSession()).Network.setCacheDisabled({ cacheDisabled: true })
})

function isChunk(url: string): boolean {
    return url.includes('/scripts/') && url.endsWith('.js') && !url.endsWith('/scripts/index.js') && !url.endsWith('/scripts/loading.js')
}

// The search index HEADs both of these for its cache key, so only loads count
function loadOf(path: string): (request: { method: string, url: string }) => boolean {
    return request => request.method === 'GET' && request.url.endsWith(path)
}

const loadOfEntry = loadOf('/scripts/index.js')
const loadOfPage = loadOf('/data-credit.html')

test('a chunk that a deploy replaced reloads the page and recovers', async (t) => {
    let replacedChunk: string | undefined
    let entryLoads = 0
    await withInterceptedRequests(t, (request) => {
        if (loadOfEntry(request)) {
            entryLoads++
        }
        if (replacedChunk === undefined && isChunk(request.url)) {
            replacedChunk = request.url
            return 'fail'
        }
        return 'continue'
    }, async () => {
        await t.navigateTo('/data-credit.html')
        await t.expect(pageDescriptorKind()).eql('dataCredit', { timeout: 30000 })
    })
    await t.expect(replacedChunk).typeOf('string')
    // The navigation, the refetch that evicts a stale entry from the cache, and the reload
    await t.expect(entryLoads).eql(3)
})

test('a chunk that stays broken shows the error instead of reloading forever', async (t) => {
    let brokenChunk: string | undefined
    let pageLoads = 0
    await withInterceptedRequests(t, (request) => {
        if (loadOfPage(request)) {
            pageLoads++
        }
        if (isChunk(request.url) && (brokenChunk === undefined || request.url === brokenChunk)) {
            brokenChunk = request.url
            return 'fail'
        }
        return 'continue'
    }, async () => {
        await t.navigateTo('/data-credit.html')
        await t.expect(Selector('h1').withExactText('Error Loading Page').exists).ok({ timeout: 30000 })
        await t.expect(Selector('code').withText(/ChunkLoadError/).exists).ok()
    })
    await t.expect(pageLoads).eql(2)
})
