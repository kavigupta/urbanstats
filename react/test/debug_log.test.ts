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

test('debug-log-persists-and-correlates-workers', async (t) => {
    await t
        .click(searchField)
        .typeText(searchField, 'Pasadena')
    await waitForSelectedSearchResult(t)

    const pageTab = (await downloadDebugLog(t)).reverse().find(({ tab, text }) => !tab.includes('/') && text.startsWith('Requested new search worker'))!.tab
    const executedOnPage = ({ tab, text }: { tab: string, text: string }): boolean => tab === `${pageTab}/search` && text.endsWith('ms to execute search')
    // The worker's write may not have committed yet
    while (!(await downloadDebugLog(t)).some(executedOnPage)) {
        await t.wait(100)
    }

    await safeReload(t)

    await t.expect((await downloadDebugLog(t)).some(executedOnPage)).ok()
})
