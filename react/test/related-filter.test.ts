import { Selector } from 'testcafe'

import { urbanstatsFixture, waitForLoading } from './test_utils'

// California, USA has many different related region types (counties, cities,
// congressional districts, etc.) making it a good target for filter tests.
urbanstatsFixture('related filter', '/article.html?longname=California%2C+USA')

const relatedSearchInput = Selector('input[data-test-id=related-search]')

const relatedButton = (name: string): Selector => Selector('a').withExactText(name)

test('filter input is present', async (t) => {
    await t.expect(relatedSearchInput.exists).ok()
    await t.expect(relatedSearchInput.getAttribute('placeholder')).eql('Filter Related Regions')
})

test('filtering by region shortname shows matching button and hides others', async (t) => {
    await t.click(relatedSearchInput).typeText(relatedSearchInput, 'San Francisco')
    await t.expect(relatedButton('San Francisco County').exists).ok()
    await t.expect(relatedButton('Alameda County').exists).notOk()
})

test('clearing the filter restores all buttons', async (t) => {
    await t.click(relatedSearchInput).typeText(relatedSearchInput, 'San Francisco')
    await t.expect(relatedButton('Alameda County').exists).notOk()
    await t.selectText(relatedSearchInput).pressKey('delete')
    await t.expect(relatedButton('Alameda County').exists).ok()
})

test('filter that matches nothing hides all related buttons', async (t) => {
    await t.click(relatedSearchInput).typeText(relatedSearchInput, 'zzzznotaplace')
    await t.expect(Selector('a.serif').exists).notOk()
})

// "Counties" is the display name for the County region type (pluralised by displayType).
// Filtering by it should show county buttons and hide unrelated region types like cities.
test('filtering by region type label shows only that type', async (t) => {
    await t.click(relatedSearchInput).typeText(relatedSearchInput, 'Counties')
    await t.expect(relatedButton('Alameda County').exists).ok()
    // Continent should not appear when filtering for Counties
    await t.expect(relatedButton('North America').exists).notOk()
})

// "Contained By" is the displayName of the "contained_by" relationship type.
// Filtering by it should show buttons from that group (e.g. USA) and hide buttons
// from other groups (e.g. California's counties in the "contains" group).
test('filtering by relationship type label shows only that relationship group', async (t) => {
    await t.click(relatedSearchInput).typeText(relatedSearchInput, 'Contained By')
    await t.expect(relatedButton('USA').exists).ok()
    // Counties are in the "contains" group, not "contained by"
    await t.expect(relatedButton('Alameda County').exists).notOk()
})

// California has 58 counties, so the county group shows "More..." by default.
// Any active search term should suppress all "More..." buttons regardless of
// how many results remain.
test('more button is not shown when any search term is active', async (t) => {
    const moreButton = Selector('a').withExactText('More...')
    await t.expect(moreButton.exists).ok()
    // "Counties" still matches all 58 counties, but More... should still be hidden
    await t.click(relatedSearchInput).typeText(relatedSearchInput, 'Counties')
    await t.expect(moreButton.exists).notOk()
    // Clearing the filter restores the More... button
    await t.selectText(relatedSearchInput).pressKey('delete')
    await t.expect(moreButton.exists).ok()
})

test('filter persists when navigating to a new article', async (t) => {
    await t.click(relatedSearchInput).typeText(relatedSearchInput, 'San Francisco')
    await t.expect(relatedButton('Alameda County').exists).notOk()
    // Navigate to Texas
    await t.click('button[data-test-id="1"]')
    await waitForLoading()
    // Filter value should be preserved after navigation
    await t.expect(relatedSearchInput.value).eql('San Francisco')
})
