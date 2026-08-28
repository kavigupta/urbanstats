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
                quizRecord = stableStringify(bCorrect)! > stableStringify(aCorrect)! ? a[key] : b[key]
            }
            return [key, quizRecord]
        })),
    }
}

/*
 * Merge friends.
 * When two lists have overlapping ids, the entry that has the lowest index in its list wins
 * When both entries have the same index, the lowest name wins
 */
export function mergeFriends(a: QuizFriends, b: QuizFriends): QuizFriends {
    let aIdx = 0
    let bIdx = 0
    const result: QuizFriends = []
    const usedIds = new Set<string>()
    while (aIdx < a.length && bIdx < b.length) {
        if (a[aIdx][1] === b[bIdx][1]) {
            // ids same
            if (!usedIds.has(a[aIdx][1])) {
                // prefer latest timestamp
                if ((a[aIdx][2] ?? 0) > (b[bIdx][2] ?? 0)) {
                    result.push(a[aIdx])
                }
                else {
                    result.push(b[bIdx])
                }
                usedIds.add(a[aIdx][1])
            }
            aIdx++
            bIdx++
        }
        // sort by timestamp
        else if ((a[aIdx][2] ?? 0) < (b[bIdx][2] ?? 0)) {
            if (!usedIds.has(a[aIdx][1])) {
                result.push(a[aIdx])
                usedIds.add(a[aIdx][1])
            }
            aIdx++
        }
        else {
            if (!usedIds.has(b[aIdx][1])) {
                result.push(b[aIdx])
                usedIds.add(b[aIdx][1])
            }
            bIdx++
        }
    }
    return result.concat(a.slice(aIdx)).concat(b.slice(bIdx))
}
