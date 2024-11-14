import '../style.css'
import '../common.css'

import { loadJSON, loadProtobuf } from '../load_json'
import { is_historical_cd } from '../utils/is_historical'

import { article_link } from './links'

export async function by_population(settings: { show_historical_cds: boolean }, domestic_only = false): Promise<void> {
    const values = (await loadProtobuf('/index/pages.gz', 'StringList')).elements
    const populations = loadJSON('/index/best_population_estimate.json') as number[]
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

        if (!settings.show_historical_cds && is_historical_cd(x!)) {
            continue
        }

        // this is specifically looking for stuff that's only in the US.
        // so it makes sense.
        if (domestic_only && (!(x!.endsWith(', USA') || (x!) === 'USA'))) {
            continue
        }

        document.location = article_link(undefined, x!)
        break
    }
}

export async function uniform(settings: { show_historical_cds: boolean }): Promise<void> {
    const values = (await loadProtobuf('/index/pages.gz', 'StringList')).elements
    while (true) {
        const randomIndex = Math.floor(Math.random() * values.length)
        const x = values[randomIndex]
        if (!settings.show_historical_cds && is_historical_cd(x)) {
            continue
        }
        document.location = article_link(undefined, x)
        break
    }
}
