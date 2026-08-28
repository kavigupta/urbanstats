import assert from 'assert/strict'
import { describe, test } from 'node:test'

import { historyConflicts, mergeFriends, mergeHistories } from '../src/quiz/merge'
import { QuizFriends, QuizHistory } from '../src/quiz/quiz'

function quiz(...correct: boolean[]): QuizHistory[string] {
    return { choices: correct.map(() => 'A'), correct_pattern: correct }
}

void describe('historyConflicts', () => {
    void test('reports keys that are in both histories with different results', () => {
        const a: QuizHistory = { 1: quiz(true), 2: quiz(true), 3: quiz(true) }
        const b: QuizHistory = { 2: quiz(false), 3: quiz(true), 4: quiz(true) }
        assert.deepEqual(historyConflicts(a, b), ['2'])
    })
})

void describe('mergeHistories', () => {
    void test('takes the union when there is no conflict', () => {
        const a: QuizHistory = { 1: quiz(true) }
        const b: QuizHistory = { 2: quiz(false) }
        assert.deepEqual(mergeHistories(a, b), { 1: quiz(true), 2: quiz(false) })
    })

    void test('prefers the longer pattern, since that user is mid-quiz', () => {
        const a: QuizHistory = { 1: quiz(true, true, true) }
        const b: QuizHistory = { 1: quiz(false) }
        assert.deepEqual(mergeHistories(a, b), { 1: quiz(true, true, true) })
        assert.deepEqual(mergeHistories(b, a), { 1: quiz(true, true, true) })
    })

    void test('prefers the lower score when the patterns are the same length', () => {
        const a: QuizHistory = { 1: quiz(true, true) }
        const b: QuizHistory = { 1: quiz(true, false) }
        assert.deepEqual(mergeHistories(a, b), { 1: quiz(true, false) })
        assert.deepEqual(mergeHistories(b, a), { 1: quiz(true, false) })
    })

    void test('resolves an equal-score conflict the same way from either side', () => {
        const a: QuizHistory = { 1: quiz(true, false) }
        const b: QuizHistory = { 1: quiz(false, true) }
        assert.deepEqual(mergeHistories(a, b), mergeHistories(b, a))
    })
})

void describe('mergeFriends', () => {
    void test('keeps entries that appear in only one list', () => {
        const a: QuizFriends = [['Alice', '0a', 1]]
        const b: QuizFriends = [['Bob', '0b', 2]]
        assert.deepEqual(mergeFriends(a, b), [['Alice', '0a', 1], ['Bob', '0b', 2]])
    })

    void test('prefers the more recently touched entry for a shared id', () => {
        const a: QuizFriends = [['Alice', '0a', 5]]
        const b: QuizFriends = [['Alicia', '0a', 9]]
        assert.deepEqual(mergeFriends(a, b), [['Alicia', '0a', 9]])
        assert.deepEqual(mergeFriends(b, a), [['Alicia', '0a', 9]])
    })

    void test('a tombstone wins over the entry it replaced', () => {
        const a: QuizFriends = [[null, '0a', 7]]
        const b: QuizFriends = [['Alice', '0a', 3]]
        assert.deepEqual(mergeFriends(a, b), [[null, '0a', 7]])
        assert.deepEqual(mergeFriends(b, a), [[null, '0a', 7]])
    })

    void test('does not read past the end of the shorter list', () => {
        const a: QuizFriends = [['Alice', '0a', 1], ['Bob', '0b', 10]]
        const b: QuizFriends = [['Carol', '0c', 5]]
        assert.deepEqual(mergeFriends(a, b), [['Alice', '0a', 1], ['Carol', '0c', 5], ['Bob', '0b', 10]])
    })

    void test('never emits the same friend twice', () => {
        const a: QuizFriends = [['Alice', '0a', 10], ['Bob', '0b', 1]]
        const b: QuizFriends = [['Bobby', '0b', 2]]
        assert.deepEqual(mergeFriends(a, b), [['Bobby', '0b', 2], ['Alice', '0a', 10]])
    })

    void test('both devices reach the same list, so syncing settles', () => {
        const cases: [QuizFriends, QuizFriends][] = [
            [[['Alice', '0a', 1], ['Bob', '0b', 10]], [['Carol', '0c', 5]]],
            [[['Alice', '0a', 10], ['Bob', '0b', 1]], [['Bobby', '0b', 2]]],
            // Same timestamp on both sides: whichever list it came from cannot decide it
            [[['Alice', '0a', 5]], [['Alicia', '0a', 5]]],
            // Timestamps out of order, which renaming a friend produces
            [[['Alice', '0a', 10], ['Bob', '0b', 1]], [['Carol', '0c', 4]]],
            [[['Alice', '0a'], ['Bob', '0b', 3]], [['Carol', '0c', 1]]],
        ]
        for (const [a, b] of cases) {
            assert.deepEqual(mergeFriends(a, b), mergeFriends(b, a))
            assert.deepEqual(mergeFriends(a, mergeFriends(a, b)), mergeFriends(a, b))
        }
    })
})
