import { HumanReadableName } from '../../utils/human-readable-name'
import { Context } from '../context'
import { USSFunctionArgType, USSFunctionReturnType, USSPrimitiveRawValue, USSRawValue, USSValue } from '../types-values'

import { orderNonNan } from './table'

/**
 * Set operations treat a vector of primitives as a set: order and duplicates are ignored on
 * input, and results are returned deduplicated and sorted in ascending order. Membership uses
 * SameValueZero (as JS Set does), so NaN matches NaN.
 */

type Primitive = USSPrimitiveRawValue

/**
 * Orders the primitives within a single (homogeneous) vector. Numbers use NaN-safe ordering,
 * booleans order false before true, strings compare lexicographically, and nulls are all equal.
 */
function comparePrimitives(a: Primitive, b: Primitive): number {
    if (typeof a === 'number' && typeof b === 'number') {
        return orderNonNan(a, b)
    }
    if (typeof a === 'boolean' && typeof b === 'boolean') {
        return (a ? 1 : 0) - (b ? 1 : 0)
    }
    if (a === null || b === null) {
        return 0
    }
    return (a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0
}

const primitiveVector = { type: 'anyPrimitiveVector' } satisfies USSFunctionArgType
const anyPrimitive = { type: 'anyPrimitive' } satisfies USSFunctionArgType
const vectorReturn = { type: 'inferFromPrimitiveVector' } satisfies USSFunctionReturnType
const booleanReturn = { type: 'concrete', value: { type: 'boolean' } } satisfies USSFunctionReturnType
const numberReturn = { type: 'concrete', value: { type: 'number' } } satisfies USSFunctionReturnType

function primitiveTypeName(value: Primitive): string {
    return value === null ? 'null' : typeof value
}

/**
 * Vectors are homogeneous by construction, so comparing the first elements is enough.
 * An empty vector has no element type and is compatible with anything.
 */
function checkSameElementType(name: string, a: Primitive[], b: Primitive[]): void {
    if (a.length === 0 || b.length === 0) {
        return
    }
    const aType = primitiveTypeName(a[0])
    const bType = primitiveTypeName(b[0])
    if (aType !== bType) {
        throw new Error(`${name} requires both vectors to have the same element type, but got ${aType} and ${bType}`)
    }
}

/**
 * When broadcasting, the same vector is passed by reference to every call, so caching the set
 * keeps operations like contains(bigVector, bigVector) linear rather than quadratic.
 */
const setCache = new WeakMap<Primitive[], Set<Primitive>>()

function asSet(values: Primitive[]): Set<Primitive> {
    let set = setCache.get(values)
    if (set === undefined) {
        set = new Set(values)
        setCache.set(values, set)
    }
    return set
}

/**
 * Caches the sorted distinct-elements array for a set so repeated conversions (e.g. the same
 * argument reused across a broadcast) don't rebuild it. The array is filled by index into a
 * preallocated buffer rather than grown element by element, then sorted so a given set always
 * yields the same order. Result vectors are treated immutably by the interpreter, so returning
 * the shared array is safe.
 */
const arrayCache = new WeakMap<Set<Primitive>, Primitive[]>()

function asArray(set: Set<Primitive>): Primitive[] {
    let array = arrayCache.get(set)
    if (array === undefined) {
        array = new Array<Primitive>(set.size)
        let i = 0
        for (const value of set) {
            array[i] = value
            i++
        }
        array.sort(comparePrimitives)
        arrayCache.set(set, array)
    }
    return array
}

function uniqueArray(values: Primitive[]): Primitive[] {
    return asArray(asSet(values))
}

function documented(
    name: string,
    posArgs: USSFunctionArgType[],
    returnType: USSFunctionReturnType,
    fn: (args: USSRawValue[]) => USSRawValue,
    humanReadableName: HumanReadableName,
    longDescription: string,
): [string, USSValue] {
    return [name, {
        type: { type: 'function', posArgs, namedArgs: {}, returnType },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for the function signature
        value: (ctx: Context, args: USSRawValue[], namedArgs: Record<string, USSRawValue>) => fn(args),
        documentation: {
            humanReadableName,
            category: 'set',
            longDescription,
        },
    }] satisfies [string, USSValue]
}

function binarySetFunction(
    name: string,
    returnType: USSFunctionReturnType,
    combine: (a: Primitive[], b: Primitive[]) => USSRawValue,
    humanReadableName: HumanReadableName,
    longDescription: string,
): [string, USSValue] {
    return documented(name, [primitiveVector, primitiveVector], returnType, (posArgs) => {
        const a = posArgs[0] as Primitive[]
        const b = posArgs[1] as Primitive[]
        checkSameElementType(name, a, b)
        return combine(a, b)
    }, humanReadableName, longDescription)
}

function differenceOf(a: Primitive[], b: Primitive[]): Primitive[] {
    const bSet = asSet(b)
    return uniqueArray(a).filter(x => !bSet.has(x))
}

function isSubsetOf(a: Primitive[], b: Primitive[]): boolean {
    const bSet = asSet(b)
    return a.every(x => bSet.has(x))
}

export const setConstants: [string, USSValue][] = [
    documented('contains', [primitiveVector, anyPrimitive], booleanReturn, (posArgs) => {
        const values = posArgs[0] as Primitive[]
        const element = posArgs[1] as Primitive
        if (values.length > 0 && primitiveTypeName(values[0]) !== primitiveTypeName(element)) {
            return false
        }
        return asSet(values).has(element)
    }, 'contains', 'Returns true if the element is present in the vector. Broadcasts over the element, so passing a vector as the second argument tests each of its elements in turn.'),
    documented('unique', [primitiveVector], vectorReturn, (posArgs) => {
        return uniqueArray(posArgs[0] as Primitive[])
    }, 'unique', 'Returns the distinct elements of a vector, sorted in ascending order.'),
    documented('countUnique', [primitiveVector], numberReturn, (posArgs) => {
        return asSet(posArgs[0] as Primitive[]).size
    }, 'count unique', 'Returns the number of distinct elements in a vector.'),
    binarySetFunction('union', vectorReturn, (a, b) => {
        // The two pieces are each sorted but disjoint, so the concatenation needs a final sort.
        return uniqueArray(a).concat(differenceOf(b, a)).sort(comparePrimitives)
    }, 'union', 'Returns the distinct elements present in either vector.'),
    binarySetFunction('intersection', vectorReturn, (a, b) => {
        const bSet = asSet(b)
        return uniqueArray(a).filter(x => bSet.has(x))
    }, 'intersection', 'Returns the distinct elements present in both vectors.'),
    binarySetFunction('difference', vectorReturn, (a, b) => {
        return differenceOf(a, b)
    }, 'difference', 'Returns the distinct elements present in the first vector but not the second.'),
    binarySetFunction('symmetricDifference', vectorReturn, (a, b) => {
        // The two pieces are each sorted but disjoint, so the concatenation needs a final sort.
        return differenceOf(a, b).concat(differenceOf(b, a)).sort(comparePrimitives)
    }, 'symmetric difference', 'Returns the distinct elements present in exactly one of the two vectors.'),
    binarySetFunction('isSubset', booleanReturn, (a, b) => {
        return isSubsetOf(a, b)
    }, 'is subset', 'Returns true if every element of the first vector is present in the second.'),
    binarySetFunction('isSuperset', booleanReturn, (a, b) => {
        return isSubsetOf(b, a)
    }, 'is superset', 'Returns true if every element of the second vector is present in the first.'),
    binarySetFunction('isDisjoint', booleanReturn, (a, b) => {
        const bSet = asSet(b)
        return !a.some(x => bSet.has(x))
    }, 'is disjoint', 'Returns true if the two vectors share no elements.'),
    binarySetFunction('setEquals', booleanReturn, (a, b) => {
        return asSet(a).size === asSet(b).size && isSubsetOf(a, b)
    }, 'set equals', 'Returns true if the two vectors contain the same distinct elements, ignoring order and duplicates.'),
]
