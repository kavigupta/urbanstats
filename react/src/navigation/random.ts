import { loadJSON, loadProtobuf } from '../load_json'
import { Settings } from '../page_template/settings'
import { isHistoricalCD } from '../utils/is_historical'
import { SearchIndex } from '../utils/protos'

export async function byPopulation(domesticOnly: boolean): Promise<() => string> {
    const index = (await loadProtobuf('/index/pages_all.gz', 'SearchIndex'))
    const populations = await loadJSON('/index/best_population_estimate.json') as number[]
    const totalWeight = populations.reduce((sum, x) => sum + x)

    return () => {
        while (true) {
        // Generate a random number between 0 and the total weight
            const randomValue = Math.random() * totalWeight

            // Find the destination based on the random value
            let idx: number
            let cumulativeWeight = 0

            for (let i = 0; i < index.elements.length; i++) {
                cumulativeWeight += populations[i]

                if (randomValue < cumulativeWeight) {
                    idx = i
                    break
                }
            }

            if (!valid(index, idx!)) {
                continue
            }

            const x = index.elements[idx!]

            // this is specifically looking for stuff that's only in the US.
            // so it makes sense.
            if (domesticOnly && (!(x.endsWith(', USA') || (x) === 'USA'))) {
                continue
            }

            return x
        }
    }
}

export async function uniform(): Promise<() => string> {
    const index = (await loadProtobuf('/index/pages_all.gz', 'SearchIndex'))
    return () => {
        while (true) {
            const randomIndex = Math.floor(Math.random() * index.elements.length)
            if (!valid(index, randomIndex)) {
                continue
            }
            return index.elements[randomIndex]
        }
    }
}

function valid(index: SearchIndex, idx: number): boolean {
    const x = index.elements[idx]
    const metadata = index.metadata[idx]
    if (metadata.isSymlink) {
        return false
    }
    if (!Settings.shared.get('show_historical_cds') && isHistoricalCD(x)) {
        return false
    }
    if (isPopulationCircle(x)) {
        return false
    }
    return true
}

function isPopulationCircle(x: string): boolean {
    for (const mpcOrBPC of ['5MPC', '10MPC', '20MPC', '50MPC', '100MPC', '200MPC', '500MPC', '1BPC']) {
        if (x.includes(`${mpcOrBPC}, `)) {
            return true
        }
    }
    return false
}
