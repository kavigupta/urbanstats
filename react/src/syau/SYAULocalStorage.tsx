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

    /** Follows renames of guessed articles, dropping guesses that aren't in `longnames` even then. */
    async updateRenamedGuesses(typ: Type, universe: Universe, longnames: Set<string>): Promise<void> {
        const key = `${typ}-${universe}` satisfies SYAUHistoryKey
        const stale = ((this.history.value[key] as SYAUHistoryForGame | undefined)?.guessed ?? []).filter(name => !longnames.has(name))
        if (stale.length === 0) {
            return
        }
        const renamed = new Map(await Promise.all(stale.map(async name => [name, await currentLongname(name)] as const)))
        // reread, in case of guesses made while resolving
        const guessed = this.history.value[key].guessed
            .map(name => renamed.has(name) ? renamed.get(name) : name)
            .filter(name => name !== undefined && longnames.has(name))
        this.history.value = { ...this.history.value, [key]: { guessed: [...new Set(guessed)] } }
    }
}
