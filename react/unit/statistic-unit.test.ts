import assert from 'assert/strict'
import { describe, test } from 'node:test'

import statistic_name_list from '../src/data/statistic_name_list'
import statistic_unit_list from '../src/data/statistic_unit_list'
import { allUnitTypes, unitForStatistic } from '../src/utils/unit'

void describe('the unit a statistic declares', () => {
    void test('is the one the statistic collection gives it', () => {
        assert.equal(unitForStatistic('Population'), 'population')
        assert.equal(unitForStatistic('Mean high temp'), 'temperature')
        assert.equal(unitForStatistic('Area'), 'area')
    })

    void test('is found through the name an old quiz stored, where a statistic has been renamed', () => {
        // Employed in Wholesale trade %, since that quiz was written
        assert.equal(unitForStatistic('Wholesale trade %'), 'percentage')
    })

    void test('is the live statistic\'s, for a name that is both', () => {
        // an old quiz meant Commute Car % (incl WFH) by this, but it names a statistic of its own now
        assert.equal(unitForStatistic('Commute Car %'), unitForStatistic('Commute Car % (incl WFH)'))
    })

    void test('is declared for every statistic, and is a unit that exists', () => {
        assert.equal(statistic_unit_list.length, statistic_name_list.length)
        assert.deepEqual(statistic_unit_list.filter(unit => !allUnitTypes.includes(unit)), [])
    })
})
