import './style.css'
import './common.css'

import { by_population, uniform } from './navigation/random'
import { load_settings } from './page_template/settings'

async function main(): Promise<void> {
    const window_info = new URLSearchParams(window.location.search)

    const [settings] = load_settings()

    const sampleby = window_info.get('sampleby')

    if (sampleby === 'uniform' || sampleby === null) {
        await uniform(settings)
    }
    else if (sampleby === 'population') {
        await by_population(settings, window_info.get('us_only')!.toLowerCase() === 'true')
    }
}

void main()
