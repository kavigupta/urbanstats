import fs from 'fs'

import { Selector } from 'testcafe'

import { safeReload, searchField, target, urbanstatsFixture, waitForDownload, waitForSelectedSearchResult } from './test_utils'

urbanstatsFixture('debug log', `${target}/`)

async function downloadDebugLog(t: TestController): Promise<{ tab: string, text: string }[]> {
    const laterThan = Date.now()
    await t.click(Selector('a').withExactText('Download debug log'))
    return fs.readFileSync(await waitForDownload(t, laterThan, '.txt'), 'utf-8').trim().split('\n').map((line) => {
        const [, tab, text] = /^\S+ (\S+) \[[^\]]*\] (.*)$/.exec(line)!
        return { tab, text }
    })
}

const isExecutedSearch = ({ text }: { text: string }): boolean => text.endsWith('ms to execute search')

test('debug-log-persists-and-correlates-workers', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena')
    await waitForSelectedSearchResult(t)
    // The worker's write may not have committed yet
    while (!(await downloadDebugLog(t)).some(isExecutedSearch)) {
        await t.wait(100)
    }

    await safeReload(t)

    const lines = await downloadDebugLog(t)
    // Only the search typed before the reload executes one
    const executed = lines.find(isExecutedSearch)
    await t.expect(executed?.tab.endsWith('/search')).ok()
    const pageTab = executed!.tab.slice(0, -'/search'.length)
    await t.expect(lines.some(({ tab, text }) => tab === pageTab && text.startsWith('Requested new search worker'))).ok()
})
