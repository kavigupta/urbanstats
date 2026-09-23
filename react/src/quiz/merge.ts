/* Pure merge rules, kept out of `sync.ts`, which depends on `QuizModel.shared` and Google Drive. */

import stableStringify from 'json-stable-stringify'

import type { QuizFriends, QuizHistory } from './quiz'

export function historyConflicts(a: QuizHistory, b: QuizHistory): string[] {
    return Object.keys(a)
        .filter(key =>
            key in b
            && stableStringify(a[key]) !== stableStringify(b[key]))
}

// When a result ties, we must resolve it consistently, otherwise we get into a sync loop
export function mergeHistories(a: QuizHistory, b: QuizHistory): QuizHistory {
    const conflicts = historyConflicts(a, b)
    return {
        ...a, ...b, ...Object.fromEntries(conflicts.map((key) => {
            const aPattern = a[key].correct_pattern
            const bPattern = b[key].correct_pattern
            if (aPattern.length !== bPattern.length) {
                // If one is more complete, return that one, since the user is taking the quiz
                return [key, aPattern.length > bPattern.length ? a[key] : b[key]]
            }

            const aCorrect = aPattern.filter(value => value).length
            const bCorrect = bPattern.filter(value => value).length
            let quizRecord
            if (aCorrect !== bCorrect) {
                quizRecord = bCorrect > aCorrect ? a[key] : b[key]
            }
            else {
                // Same score, different answers. Order on the records so both devices pick the same one
                quizRecord = stableStringify(a[key])! < stableStringify(b[key])! ? a[key] : b[key]
            }
            return [key, quizRecord]
        })),
    }
}

/*
 * Keeps the most recently touched entry per id. Both devices must get the same list or they sync forever,
 * so ordering and tie-breaks depend only on content, never on input order or locale.
 */
export function mergeFriends(a: QuizFriends, b: QuizFriends): QuizFriends {
    const byId = new Map<string, QuizFriends[number]>()
    for (const entry of [...a, ...b]) {
        const existing = byId.get(entry[1])
        if (existing === undefined || supersedes(entry, existing)) {
            byId.set(entry[1], entry)
        }
    }
    return [...byId.values()].sort((x, y) => (x[2] ?? 0) - (y[2] ?? 0) || (x[1] < y[1] ? -1 : 1))
}

function supersedes(x: QuizFriends[number], y: QuizFriends[number]): boolean {
    const xTime = x[2] ?? 0
    const yTime = y[2] ?? 0
    return xTime === yTime ? stableStringify(x)! < stableStringify(y)! : xTime > yTime
}
