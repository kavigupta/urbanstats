import assert from 'assert/strict'
import { describe, test } from 'node:test'

import './util/fetch'
import { getCountsByArticleType } from '../src/components/countsByArticleType'
import { StatName } from '../src/page_template/statistic-tree'
import { crossSourceBorderExclusion } from '../src/stat/crossSourceBorder'
import { Universe } from '../src/universe'

const usCensusPopulation = 'Population' satisfies StatName
const statCanPopulation = 'Population [StatCan]' satisfies StatName
const ghslPopulation = 'Population [GHS-POP]' satisfies StatName
// A US Census statistic with no variant from any other source
const usCensusOnly = 'Arthritis %' satisfies StatName
// A US Census statistic with a StatCan variant that covers fewer regions
const usCensusRace = 'White %' satisfies StatName

// Loaded once (cached in the module) and served by the test proxy, like the other
// data-loading unit tests.
const countsPromise = getCountsByArticleType()

async function exclusion(statName: StatName, articleType: string, universe: Universe): Promise<ReturnType<typeof crossSourceBorderExclusion>> {
    return crossSourceBorderExclusion({ statName, articleType, universe, counts: await countsPromise })
}

void describe('crossSourceBorderExclusion', () => {
    void describe('geography limited to one country (most superseding)', () => {
        void test('fires for a US-only geography viewed in a broad universe', async () => {
            assert.deepEqual(await exclusion(usCensusPopulation, 'City', 'world'), {
                kind: 'geography-limited-to-country',
                geographyCountry: 'USA',
            })
        })

        void test('fires for a Canada-only geography viewed in a broad universe', async () => {
            assert.deepEqual(await exclusion(usCensusPopulation, 'CA Riding', 'world'), {
                kind: 'geography-limited-to-country',
                geographyCountry: 'Canada',
            })
        })

        void test('is silent when the universe is inside the geography\'s country', async () => {
            assert.equal(await exclusion(usCensusPopulation, 'City', 'USA'), undefined)
            assert.equal(await exclusion(usCensusPopulation, 'City', 'California, USA'), undefined)
        })
    })

    void describe('statistic drops regions straddling its border (universe inside its country)', () => {
        void test('offers the broader source when the statistic has one', async () => {
            assert.deepEqual(await exclusion(usCensusPopulation, 'Urban Center', 'USA'), {
                kind: 'straddles-border',
                excludedCount: 13,
                totalCount: 337,
                statisticCountry: 'USA',
                alternative: { kind: 'broader-source', statName: ghslPopulation },
            })
        })

        void test('offers a domestic region type when the statistic has one source', async () => {
            assert.deepEqual(await exclusion(usCensusOnly, 'Urban Center', 'USA'), {
                kind: 'straddles-border',
                excludedCount: 13,
                totalCount: 337,
                statisticCountry: 'USA',
                alternative: { kind: 'domestic-type', articleType: 'Urban Area' },
            })
        })

        void test('offers no alternative when neither exists', async () => {
            // Person circles are border-crossing but have no domestic equivalent type
            assert.deepEqual(await exclusion(usCensusOnly, '5M Person Circle', 'USA'), {
                kind: 'straddles-border',
                excludedCount: 16,
                totalCount: 77,
                statisticCountry: 'USA',
                alternative: undefined,
            })
        })
    })

    void describe('statistic covers only its country (universe is broader)', () => {
        void test('offers the broader source when the statistic has one', async () => {
            assert.deepEqual(await exclusion(usCensusPopulation, 'Urban Center', 'world'), {
                kind: 'outside-jurisdiction',
                excludedCount: 9834,
                totalCount: 10158,
                statisticCountry: 'USA',
                alternative: { kind: 'broader-source', statName: ghslPopulation },
            })
        })

        void test('offers a domestic region type when the statistic has one source', async () => {
            assert.deepEqual(await exclusion(usCensusOnly, 'Urban Center', 'world'), {
                kind: 'outside-jurisdiction',
                excludedCount: 9834,
                totalCount: 10158,
                statisticCountry: 'USA',
                alternative: { kind: 'domestic-type', articleType: 'Urban Area' },
            })
        })

        void test('fires for a non-border-crossing multi-country type (Subnational Region)', async () => {
            // The region type can't straddle a border, but its non-US regions still lie
            // outside a US statistic's coverage. Its StatCan variant covers fewer regions,
            // so it isn't offered as a broader source.
            assert.deepEqual(await exclusion(usCensusRace, 'Subnational Region', 'world'), {
                kind: 'outside-jurisdiction',
                excludedCount: 3599,
                totalCount: 3651,
                statisticCountry: 'USA',
                alternative: undefined,
            })
        })
    })

    void describe('no disclaimer', () => {
        void test('is silent for a statistic with an international data source', async () => {
            assert.equal(await exclusion(ghslPopulation, 'Urban Center', 'USA'), undefined)
        })

        void test('is silent when the statistic reaches none of the region set', async () => {
            // StatCan has no data for US urban centers
            assert.equal(await exclusion(statCanPopulation, 'Urban Center', 'USA'), undefined)
        })

        void test('is silent for a data gap in a non-crossing type inside its country', async () => {
            // 4 US territories lack the statistic, but territories don't straddle a border,
            // so this is a data gap rather than a border exclusion
            assert.equal(await exclusion(usCensusOnly, 'Subnational Region', 'USA'), undefined)
        })
    })
})
