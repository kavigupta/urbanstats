import assert from 'assert/strict'
import { test } from 'node:test'

import { evaluate, InterpretationError } from '../src/urban-stats-script/interpreter'
import { USSRawValue, USSType, USSValue, undocValue } from '../src/urban-stats-script/types-values'

import { boolType, emptyContext, numType, parseExpr, stringType, testingContext } from './urban-stats-script-utils'

const numVectorType = { type: 'vector', elementType: numType } satisfies USSType
const stringVectorType = { type: 'vector', elementType: stringType } satisfies USSType
const boolVectorType = { type: 'vector', elementType: boolType } satisfies USSType
const emptyVectorType = { type: 'vector', elementType: { type: 'elementOfEmptyVector' } } satisfies USSType

function evaluateExpr(input: string): ReturnType<typeof evaluate> {
    return evaluate(parseExpr(input), emptyContext())
}

function expectError(input: string, message: string): void {
    assert.throws(
        () => evaluateExpr(input),
        (e: unknown) => e instanceof InterpretationError && e.message.includes(message),
        `Expected ${input} to fail with a message containing ${message}`,
    )
}

void test('contains', (): void => {
    assert.deepStrictEqual(evaluateExpr('contains([1, 2, 3], 2)'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('contains([1, 2, 3], 5)'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('contains([], 1)'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('contains(["a", "b"], "b")'), undocValue(true, boolType))
    // NaN is found, matching JS Set's SameValueZero semantics
    assert.deepStrictEqual(evaluateExpr('contains([NaN], NaN)'), undocValue(true, boolType))
})

void test('contains broadcasts over the element argument', (): void => {
    assert.deepStrictEqual(
        evaluateExpr('contains([1, 2, 3], [1, 5, 3])'),
        undocValue([true, false, true], boolVectorType),
    )
    // a vector of vectors broadcasts over the set argument instead
    assert.deepStrictEqual(
        evaluateExpr('contains([[1, 2], [3, 4]], 1)'),
        undocValue([true, false], boolVectorType),
    )
})

void test('contains with a mismatched element type is false, not an error', (): void => {
    assert.deepStrictEqual(evaluateExpr('contains([1, 2], "1")'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('contains([1, 2], null)'), undocValue(false, boolType))
})

void test('unique and countUnique', (): void => {
    assert.deepStrictEqual(evaluateExpr('unique([1, 1, 2, 3, 2])'), undocValue([1, 2, 3], numVectorType))
    assert.deepStrictEqual(evaluateExpr('unique([])'), undocValue([], emptyVectorType))
    // results are sorted, not in first-appearance order
    assert.deepStrictEqual(evaluateExpr('unique(["b", "a", "b"])'), undocValue(['a', 'b'], stringVectorType))
    assert.deepStrictEqual(evaluateExpr('countUnique([1, 1, 2, 3, 2])'), undocValue(3, numType))
    assert.deepStrictEqual(evaluateExpr('countUnique([])'), undocValue(0, numType))
})

void test('union, intersection, difference, symmetricDifference', (): void => {
    assert.deepStrictEqual(evaluateExpr('union([1, 2], [2, 3])'), undocValue([1, 2, 3], numVectorType))
    assert.deepStrictEqual(evaluateExpr('intersection([1, 2], [2, 3])'), undocValue([2], numVectorType))
    assert.deepStrictEqual(evaluateExpr('difference([1, 2], [2, 3])'), undocValue([1], numVectorType))
    assert.deepStrictEqual(evaluateExpr('symmetricDifference([1, 2], [2, 3])'), undocValue([1, 3], numVectorType))
})

void test('set operations deduplicate their results', (): void => {
    assert.deepStrictEqual(evaluateExpr('union([1, 1], [1, 2, 2])'), undocValue([1, 2], numVectorType))
    assert.deepStrictEqual(evaluateExpr('intersection([1, 1, 2], [1, 1])'), undocValue([1], numVectorType))
    assert.deepStrictEqual(evaluateExpr('difference([1, 1, 3], [2])'), undocValue([1, 3], numVectorType))
    assert.deepStrictEqual(evaluateExpr('symmetricDifference([1, 1], [2, 2])'), undocValue([1, 2], numVectorType))
})

void test('set operations return sorted results regardless of input order', (): void => {
    assert.deepStrictEqual(evaluateExpr('union([3, 1], [2, 1])'), undocValue([1, 2, 3], numVectorType))
    assert.deepStrictEqual(evaluateExpr('intersection([3, 1, 2], [2, 3])'), undocValue([2, 3], numVectorType))
    assert.deepStrictEqual(evaluateExpr('symmetricDifference([3, 1], [4, 1])'), undocValue([3, 4], numVectorType))
    // union is sorted across both pieces, not just concatenated sorted runs
    assert.deepStrictEqual(evaluateExpr('union([5, 1], [3])'), undocValue([1, 3, 5], numVectorType))
    assert.deepStrictEqual(evaluateExpr('symmetricDifference([5, 1], [3, 1])'), undocValue([3, 5], numVectorType))
})

void test('numbers sort numerically, not lexicographically', (): void => {
    assert.deepStrictEqual(evaluateExpr('unique([10, 2, 1, 20])'), undocValue([1, 2, 10, 20], numVectorType))
    assert.deepStrictEqual(evaluateExpr('unique([-3, 5, -10, 0])'), undocValue([-10, -3, 0, 5], numVectorType))
})

void test('a vector of nulls collapses to a single null', (): void => {
    assert.deepStrictEqual(
        evaluateExpr('unique([null, null])'),
        undocValue([null], { type: 'vector', elementType: { type: 'null' } }),
    )
})

void test('set operations on empty vectors', (): void => {
    assert.deepStrictEqual(evaluateExpr('union([], [])'), undocValue([], emptyVectorType))
    assert.deepStrictEqual(evaluateExpr('union([], [1, 2])'), undocValue([1, 2], numVectorType))
    assert.deepStrictEqual(evaluateExpr('union([1, 2], [])'), undocValue([1, 2], numVectorType))
    assert.deepStrictEqual(evaluateExpr('intersection([1, 2], [])'), undocValue([], emptyVectorType))
    assert.deepStrictEqual(evaluateExpr('difference([], [1])'), undocValue([], emptyVectorType))
})

void test('predicates', (): void => {
    assert.deepStrictEqual(evaluateExpr('isSubset([1, 2], [1, 2, 3])'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('isSubset([1, 4], [1, 2, 3])'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('isSuperset([1, 2, 3], [1, 2])'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('isSuperset([1, 2], [1, 2, 3])'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('isDisjoint([1, 2], [3, 4])'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('isDisjoint([1, 2], [2, 3])'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('setEquals([1, 2, 2], [2, 1])'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('setEquals([1, 2], [1, 2, 3])'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('setEquals([1, 2], [1, 3])'), undocValue(false, boolType))
})

void test('predicates on empty vectors', (): void => {
    assert.deepStrictEqual(evaluateExpr('isSubset([], [1])'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('isSuperset([], [1])'), undocValue(false, boolType))
    assert.deepStrictEqual(evaluateExpr('isDisjoint([], [1])'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('setEquals([], [])'), undocValue(true, boolType))
    assert.deepStrictEqual(evaluateExpr('setEquals([], [1])'), undocValue(false, boolType))
})

void test('set operations work on strings and booleans', (): void => {
    assert.deepStrictEqual(
        evaluateExpr('union(["a", "b"], ["b", "c"])'),
        undocValue(['a', 'b', 'c'], stringVectorType),
    )
    // booleans sort false before true
    assert.deepStrictEqual(
        evaluateExpr('unique([true, false, true])'),
        undocValue([false, true], boolVectorType),
    )
})

void test('mismatched element types are rejected', (): void => {
    expectError('union([1, 2], ["a"])', 'union requires both vectors to have the same element type, but got number and string')
    expectError('isSubset([1], [true])', 'isSubset requires both vectors to have the same element type, but got number and boolean')
})

void test('non-primitive vectors are rejected', (): void => {
    expectError('union([{a: 1}], [{a: 2}])', 'Expected positional argument 1 to be a [any]')
})

void test('set operations broadcast over nested vectors', (): void => {
    assert.deepStrictEqual(
        evaluateExpr('union([[1, 2], [3, 4]], [[2, 5], [4, 6]])'),
        undocValue([[1, 2, 5], [3, 4, 6]], { type: 'vector', elementType: numVectorType }),
    )
    assert.deepStrictEqual(
        evaluateExpr('countUnique([[1, 1, 2], [3, 3, 3]])'),
        undocValue([2, 1], numVectorType),
    )
})

void test('broadcast result type is inferred from the first non-empty leaf', (): void => {
    assert.deepStrictEqual(
        evaluateExpr('intersection([[1, 2], [3, 4]], [[5], [4]])'),
        undocValue([[], [4]], { type: 'vector', elementType: numVectorType }),
    )
    assert.deepStrictEqual(
        evaluateExpr('intersection([[1], [3]], [[5], [4]])'),
        undocValue([[], []], { type: 'vector', elementType: emptyVectorType }),
    )
})

// A vector bound to a USS variable keeps one array reference, so it flows unchanged into every
// evaluation. This lets us observe the caches through the interpreter, without exporting internals.
function contextWithVector(name: string, values: USSRawValue): ReturnType<typeof testingContext> {
    const value: USSValue = undocValue(values, numVectorType)
    return testingContext([], [], new Map<string, USSValue>([[name, value]]))
}

void test('both caches: repeated use of one vector reference reuses the result array', (): void => {
    const ctx = contextWithVector('v', [3, 1, 2, 1])
    const first = evaluate(parseExpr('unique(v)'), ctx)
    const second = evaluate(parseExpr('unique(v)'), ctx)
    // The array cache can only hit if the set cache also hit (it is keyed on the set instance),
    // so a shared result reference exercises both caches at once.
    assert.strictEqual(first.value, second.value)
    // The preallocated buffer has no trailing holes (deepStrictEqual checks length exactly).
    assert.deepStrictEqual(first.value, [1, 2, 3])
})

void test('caches are keyed on vector reference, not on contents', (): void => {
    // Two separate literals are distinct arrays, so each unique() rebuilds from scratch.
    const first = evaluateExpr('unique([3, 1, 2, 1])')
    const second = evaluateExpr('unique([3, 1, 2, 1])')
    assert.notStrictEqual(first.value, second.value)
    assert.deepStrictEqual(first.value, second.value)
})
