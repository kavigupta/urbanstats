import assert from 'assert/strict'
import { mock, test } from 'node:test'

import './util/localStorage'
import './util/window'
import type { StatPath } from '../src/page_template/statistic-tree'

// Importing the navigator builds the whole router. This test only uses the non-hook exports.
mock.module('../src/navigation/Navigator', { namedExports: { Navigator: {} } })

const { getAvailableGroups, sectionsMatchingSearch } = await import('../src/page_template/statistic-settings')

/** A page with one of Main's two density statistics and none of Other Densities'. */
const page: StatPath[] = ['gpw_population', 'gpw_pw_density_1']
const available = new Set(getAvailableGroups(page))

void test('a filtered section keeps the matching groups the page is missing', () => {
    const sections = sectionsMatchingSearch('density', available)
    // Other Densities matches too, and is dropped because the page has none of it.
    assert.deepStrictEqual(sections.map(section => section.category.id), ['main'])
    // AW Density is not on this page, but the category checkbox still writes its setting.
    assert.deepStrictEqual(sections[0].groups.map(group => group.id), ['ad_1', 'sd'])
    assert.deepStrictEqual(sections[0].groups.filter(group => available.has(group)).map(group => group.id), ['ad_1'])
})
