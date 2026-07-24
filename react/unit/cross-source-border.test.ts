import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { CountsByUT } from '../src/components/countsByArticleType'
import statNames from '../src/data/statistic_name_list'
import { StatName } from '../src/page_template/statistic-tree'
import { crossSourceBorderExclusion } from '../src/stat/crossSourceBorder'
import { Universe } from '../src/universe'

const usCensusPopulation = 'Population' satisfies StatName
const statCanPopulation = 'Population [StatCan]' satisfies StatName
const ghslPopulation = 'Population [GHS-POP]' satisfies StatName
// A US Census statistic with no variant from any other source
const usCensusOnly = 'Arthritis %' satisfies StatName

/**
 * `counts` is indexed by statistic index and run-length encoded, so spell out the counts
 * by name and then encode them.
 */
function makeCounts(byUniverseAndType: Record<string, Record<string, Record<string, number>>>): CountsByUT {
    return Object.fromEntries(Object.entries(byUniverseAndType).map(([universe, byType]) => [
        universe,
        Object.fromEntries(Object.entries(byType).map(([typ, byStat]) => [
            typ,
            statNames.map(statName => [byStat[statName] ?? 0, 1] satisfies [number, number]),
        ])),
    ]))
}

const counts = makeCounts({
    USA: {
        // 13 of the 337 US urban centers straddle the Canadian or Mexican border
        'Urban Center': { [usCensusPopulation]: 324, [ghslPopulation]: 337, [usCensusOnly]: 324 },
        'Urban Area': { [usCensusPopulation]: 2638, [usCensusOnly]: 2638 },
        // A statistic that covers every urban center leaves nothing to disclaim
        'Metropolitan Cluster': { [usCensusPopulation]: 1231, [ghslPopulation]: 1231 },
        // Person circles are border-crossing but have no domestic equivalent type
        '5M Person Circle': { [usCensusOnly]: 61, [ghslPopulation]: 77 },
        // 4 US territories lack the statistic; states each lie in one country, so this is a
        // data gap, not a border issue
        'Subnational Region': { [usCensusPopulation]: 56, [usCensusOnly]: 52 },
    },
    world: {
        'Urban Center': { [usCensusPopulation]: 324, [ghslPopulation]: 10158, [usCensusOnly]: 324 },
        'Urban Area': { [usCensusPopulation]: 2638, [usCensusOnly]: 2638 },
        // A US statistic over the world's subnational regions covers only the US ones
        'Subnational Region': { [usCensusOnly]: 52, [ghslPopulation]: 3651 },
    },
})

function exclusion(statName: StatName, articleType: string, universe: Universe): ReturnType<typeof crossSourceBorderExclusion> {
    return crossSourceBorderExclusion({ statName, articleType, universe, counts })
}

void describe('crossSourceBorderExclusion', () => {
    void describe('geography limited to one country (most superseding)', () => {
        void test('fires for a US-only geography viewed in a broad universe', () => {
            assert.deepEqual(exclusion(usCensusPopulation, 'City', 'world'), {
                kind: 'geography-limited-to-country',
                geographyCountry: 'USA',
            })
        })

        void test('fires for a Canada-only geography viewed in a broad universe', () => {
            assert.deepEqual(exclusion(usCensusPopulation, 'CA Riding', 'world'), {
                kind: 'geography-limited-to-country',
                geographyCountry: 'Canada',
            })
        })

        void test('is silent when the universe is inside the geography\'s country', () => {
            assert.equal(exclusion(usCensusPopulation, 'City', 'USA'), undefined)
            assert.equal(exclusion(usCensusPopulation, 'City', 'California, USA'), undefined)
        })
    })

    void describe('statistic drops regions straddling its border (universe inside its country)', () => {
        void test('offers the broader source when the statistic has one', () => {
            assert.deepEqual(exclusion(usCensusPopulation, 'Urban Center', 'USA'), {
                kind: 'straddles-border',
                excludedCount: 13,
                totalCount: 337,
                statisticCountry: 'USA',
                alternative: { kind: 'broader-source', statName: ghslPopulation },
            })
        })

        void test('offers a domestic region type when the statistic has one source', () => {
            assert.deepEqual(exclusion(usCensusOnly, 'Urban Center', 'USA'), {
                kind: 'straddles-border',
                excludedCount: 13,
                totalCount: 337,
                statisticCountry: 'USA',
                alternative: { kind: 'domestic-type', articleType: 'Urban Area' },
            })
        })

        void test('offers no alternative when neither exists', () => {
            assert.deepEqual(exclusion(usCensusOnly, '5M Person Circle', 'USA'), {
                kind: 'straddles-border',
                excludedCount: 16,
                totalCount: 77,
                statisticCountry: 'USA',
                alternative: undefined,
            })
        })
    })

    void describe('statistic covers only its country (universe is broader)', () => {
        void test('offers the broader source when the statistic has one', () => {
            assert.deepEqual(exclusion(usCensusPopulation, 'Urban Center', 'world'), {
                kind: 'outside-jurisdiction',
                excludedCount: 9834,
                totalCount: 10158,
                statisticCountry: 'USA',
                alternative: { kind: 'broader-source', statName: ghslPopulation },
            })
        })

        void test('offers a domestic region type when the statistic has one source', () => {
            assert.deepEqual(exclusion(usCensusOnly, 'Urban Center', 'world'), {
                kind: 'outside-jurisdiction',
                excludedCount: 9834,
                totalCount: 10158,
                statisticCountry: 'USA',
                alternative: { kind: 'domestic-type', articleType: 'Urban Area' },
            })
        })

        void test('fires for a non-border-crossing multi-country type (Subnational Region)', () => {
            // The region type can't straddle a border, but its non-US regions still lie
            // outside a US statistic's coverage
            assert.deepEqual(exclusion(usCensusOnly, 'Subnational Region', 'world'), {
                kind: 'outside-jurisdiction',
                excludedCount: 3599,
                totalCount: 3651,
                statisticCountry: 'USA',
                alternative: undefined,
            })
        })
    })

    void describe('no disclaimer', () => {
        void test('is silent when the statistic covers every region', () => {
            assert.equal(exclusion(usCensusPopulation, 'Metropolitan Cluster', 'USA'), undefined)
        })

        void test('is silent for a statistic with an international data source', () => {
            assert.equal(exclusion(ghslPopulation, 'Urban Center', 'USA'), undefined)
        })

        void test('is silent when the statistic reaches none of the region set', () => {
            // No US Census data for a purely Canadian region set
            assert.equal(exclusion(statCanPopulation, 'Urban Center', 'USA'), undefined)
        })

        void test('is silent for a data gap in a non-crossing type inside its country', () => {
            // 4 US territories lack the statistic, but territories don't straddle a border,
            // so this is a data gap rather than a border exclusion
            assert.equal(exclusion(usCensusOnly, 'Subnational Region', 'USA'), undefined)
        })
    })
})
