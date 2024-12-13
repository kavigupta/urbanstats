import '../style.css'
import '../common.css'

import { loadJSON, loadProtobuf } from '../load_json'
import { Settings } from '../page_template/settings'
import { isHistoricalCD } from '../utils/is_historical'

export async function byPopulation(domesticOnly: boolean): Promise<string> {
    const values = (await loadProtobuf('/index/pages.gz', 'StringList')).elements
    const populations = await loadJSON('/index/best_population_estimate.json') as number[]
    const totalWeight = populations.reduce((sum, x) => sum + x)

    while (true) {
        // Generate a random number between 0 and the total weight
        const randomValue = Math.random() * totalWeight

        // Find the destination based on the random value
        let x: string
        let cumulativeWeight = 0

        for (let i = 0; i < values.length; i++) {
            cumulativeWeight += populations[i]

            if (randomValue < cumulativeWeight) {
                x = values[i]
                break
            }
        }

        if (!Settings.shared.get('show_historical_cds') && isHistoricalCD(x!)) {
            continue
        }

        // this is specifically looking for stuff that's only in the US.
        // so it makes sense.
        if (domesticOnly && (!(x!.endsWith(', USA') || (x!) === 'USA'))) {
            continue
        }

        return x!
    }
}

export async function uniform(): Promise<string> {
    const values = (await loadProtobuf('/index/pages.gz', 'StringList')).elements
    while (true) {
        const randomIndex = Math.floor(Math.random() * values.length)
        const x = values[randomIndex]
        if (!Settings.shared.get('show_historical_cds') && isHistoricalCD(x)) {
            continue
        }
        return x
    }
}
