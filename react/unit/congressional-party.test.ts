import assert from 'assert/strict'
import { test } from 'node:test'

import { getPartyPage } from '../src/components/congressional-table/party-page'

void test('a party with an article has its page and colour', () => {
    assert.equal(getPartyPage('Democratic Party')?.wikipedia_page, 'https://en.wikipedia.org/wiki/Democratic_Party_(United_States)')
    assert.notEqual(getPartyPage('Silver Party')?.party_color, undefined)
})

// representatives.csv names 44 parties where party_pages.json describes the 42 with an article,
// so a lookup has to come up empty rather than insist: Francis G. Newlands sat for Nevada in the
// 53rd Congress for the Fusion Party, and asserting on it took the whole article down
for (const party of ['Fusion Party', 'Independent', 'Whatever Party', '', null, undefined] as const) {
    void test(`a party the data has no page for, ${JSON.stringify(party)}, has none`, () => {
        assert.equal(getPartyPage(party), undefined)
    })
}
