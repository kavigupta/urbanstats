import { symlinkTargets } from '../load_json'
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
        let guessed = (this.history.value[key] as SYAUHistoryForGame | undefined)?.guessed ?? []
        let outdated = guessed.filter(name => !longnames.has(name))
        if (outdated.length === 0) {
            return
        }
        // a level of symlinks at a time, since an article can be renamed more than once
        while (outdated.length > 0) {
            let targets
            try {
                targets = await symlinkTargets(outdated)
            }
            catch {
                // leaves the history as it was, to try again next load
                return
            }
            const renamed = new Map(outdated.flatMap((name, i) => targets[i] === undefined ? [] : [[name, targets[i]] as const]))
            guessed = guessed.map(name => renamed.get(name) ?? name)
            outdated = [...renamed.values()].filter(name => !longnames.has(name))
        }
        this.history.value = { ...this.history.value, [key]: { guessed: [...new Set(guessed)] } }
    }
}
