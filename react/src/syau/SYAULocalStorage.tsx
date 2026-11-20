import { currentLongname } from '../load_json'
import { StoredProperty } from '../quiz/quiz'
import { Universe } from '../universe'

import { SYAUHistory, Type, SYAUHistoryForGame, SYAUHistoryKey } from './syau-panel'

export class SYAULocalStorage {
    private constructor() {
        // Private constructor
    }

    static shared = new SYAULocalStorage()

    readonly history = new StoredProperty<SYAUHistory>(
        'syau_history',
        storedValue => JSON.parse(storedValue ?? '{}') as SYAUHistory,
        value => JSON.stringify(value),
    )

    useHistory(typ: Type, universe: Universe): [SYAUHistoryForGame, (newHistory: SYAUHistoryForGame) => void] {
        const key = `${typ}-${universe}` satisfies SYAUHistoryKey
        const history = this.history.use()
        const current: SYAUHistoryForGame = history[key] ?? { guessed: [] }
        return [current, (newHistory) => {
            this.history.value = { ...history, [key]: newHistory }
        }]
    }

    /** Renames guesses of articles that have been renamed since; only names not in `longnames` are looked up. */
    async normalizeGuesses(typ: Type, universe: Universe, longnames: Set<string>): Promise<void> {
        const key = `${typ}-${universe}` satisfies SYAUHistoryKey
        const guessed = (this.history.value[key] as SYAUHistoryForGame | undefined)?.guessed ?? []
        if (guessed.every(name => longnames.has(name))) {
            return
        }
        const normalized = await Promise.all(guessed.map(async name => longnames.has(name) ? name : (await currentLongname(name)) ?? name))
        this.history.value = { ...this.history.value, [key]: { guessed: [...new Set(normalized)] } }
    }
}
