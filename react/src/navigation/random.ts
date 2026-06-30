import universes_ordered from '../data/universes_ordered'
import { loadJSON, loadProtobuf } from '../load_json'
import { Settings } from '../page_template/settings'
import { assert } from '../utils/defensive'
import { SearchIndex } from '../utils/protos'
import { isAllowedToBeShown } from '../utils/restricted-types'

function universeIdx(universe: string): number {
    const idx = universes_ordered.indexOf(universe as typeof universes_ordered[number])
    assert(idx !== -1, `Unknown universe: ${universe}`)
    return idx
}

function inUniverse(index: SearchIndex, idx: number, filterUniverseIdx: number): boolean {
    return (index.metadata[idx].universeIdxs?.includes(filterUniverseIdx) ?? false) && index.elements[idx] !== universes_ordered[filterUniverseIdx]
}

export async function byPopulation(universe: string | undefined): Promise<() => string> {
    const [index, populations] = await Promise.all([
        loadProtobuf('/index/pages_all.gz', 'SearchIndex'),
        loadJSON('/index/best_population_estimate.json') as Promise<number[]>,
    ])
    const filterUniverseIdx = universe !== undefined ? universeIdx(universe) : undefined

    const entries: number[] = []
    let filteredWeight = 0
    for (let i = 0; i < index.elements.length; i++) {
        if (valid(index, i) && (filterUniverseIdx === undefined || inUniverse(index, i, filterUniverseIdx))) {
            entries.push(i)
            filteredWeight += populations[i]
        }
    }

    return () => {
        const randomValue = Math.random() * filteredWeight
        let cumulativeWeight = 0
        for (const i of entries) {
            cumulativeWeight += populations[i]
            if (randomValue < cumulativeWeight) {
                return index.elements[i]
            }
        }
        assert(false, 'Should not happen')
    }
}

export async function uniform(universe: string | undefined): Promise<() => string> {
    const index = (await loadProtobuf('/index/pages_all.gz', 'SearchIndex'))
    const filterUniverseIdx = universe !== undefined ? universeIdx(universe) : undefined
    return () => {
        while (true) {
            const randomIndex = Math.floor(Math.random() * index.elements.length)
            if (!valid(index, randomIndex)) {
                continue
            }
            if (filterUniverseIdx !== undefined && !inUniverse(index, randomIndex, filterUniverseIdx)) {
                continue
            }
            return index.elements[randomIndex]
        }
    }
}

function valid(index: SearchIndex, idx: number): boolean {
    const metadata = index.metadata[idx]
    if (metadata.isSymlink) {
        return false
    }
    return isAllowedToBeShown(metadata.type!, {
        show_historical_cds: Settings.shared.get('show_historical_cds'),
        show_person_circles: false, // always hide person circles in search
    })
}
