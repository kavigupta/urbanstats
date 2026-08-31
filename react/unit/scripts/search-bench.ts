/**
 * Times `search` against the real index, for comparing a change against the branch it came from.
 *
 * Run it on both sides of the change and compare the reported ms/query; the absolute number means
 * nothing across machines. Needs a dev server, like the unit tests.
 */
import '../util/fetch'

import { createIndex } from '../../src/search'

import queries from './search-bench-queries.json'

const rounds = 3

async function main(): Promise<void> {
    const search = await createIndex({ cacheKey: undefined, statsUniverse: 'allUniverses' }, () => Promise.resolve())

    const params = (pattern: string): Parameters<typeof search>[0] => ({
        unnormalizedPattern: pattern,
        maxResults: 10,
        showSettings: { show_historical_cds: false, show_person_circles: true },
        prioritizeTypeIndex: undefined,
    })

    for (const query of queries) {
        search(params(query))
    }

    const perQuery: number[] = []
    for (let round = 0; round < rounds; round++) {
        const start = performance.now()
        for (const query of queries) {
            search(params(query))
        }
        perQuery.push((performance.now() - start) / queries.length)
    }

    perQuery.sort((a, b) => a - b)
    console.warn(`${perQuery[Math.floor(rounds / 2)].toFixed(1)} ms/query (median of ${rounds} rounds over ${queries.length} queries; rounds: ${perQuery.map(t => t.toFixed(1)).join(', ')})`)
}

void main()
