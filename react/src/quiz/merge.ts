/*
 * Merging two copies of a quiz profile. Kept apart from `sync.ts` so these stay pure functions of
 * their arguments: `sync.ts` reaches for `QuizModel.shared` and Google Drive, neither of which a
 * merge rule should need.
 */

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
 * Merge two friend lists by id, keeping the more recently touched entry for each.
 *
 * Both devices have to arrive at the same list from the same pair of inputs, or each will keep
 * uploading its own and the two will sync back and forth forever. So the result is ordered by
 * timestamp rather than by either input's order, and timestamp ties are broken on content rather
 * than on which list the entry came from. Ids are compared directly rather than with
 * `localeCompare`, whose ordering depends on the device's locale.
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
