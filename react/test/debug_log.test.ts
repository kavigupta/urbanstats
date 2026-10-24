import fs from 'fs'

import { Selector } from 'testcafe'

import { safeReload, searchField, target, urbanstatsFixture, waitForDownload, waitForSelectedSearchResult } from './test_utils'

urbanstatsFixture('debug log', `${target}/`)

test('debug-log-persists-and-correlates-workers', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena')
    await waitForSelectedSearchResult(t)

    await safeReload(t)

    const laterThan = Date.now()
    await t.click(Selector('a').withExactText('Download debug log'))
    const lines = fs.readFileSync(await waitForDownload(t, laterThan, '.txt'), 'utf-8').trim().split('\n').map((line) => {
        const [, tab, text] = /^\S+ (\S+) \[[^\]]*\] (.*)$/.exec(line)!
        return { tab, text }
    })

    // Only the search typed before the reload executes one
    const executed = lines.find(({ text }) => text.endsWith('ms to execute search'))
    await t.expect(executed?.tab.endsWith('/search')).ok()
    const pageTab = executed!.tab.slice(0, -'/search'.length)
    await t.expect(lines.some(({ tab, text }) => tab === pageTab && text.startsWith('Requested new search worker'))).ok()
})
