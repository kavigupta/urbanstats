import { assert } from '../utils/defensive'

import { Context } from './context'
import { LocInfo } from './lexer'
import { getPrimitiveType, renderType, undocValue, unifyType, USSPrimitiveRawValue, USSRawValue, USSType, USSValue, USSVectorType } from './types-values'

function collectUniqueMaskValues(collectIn: Set<USSPrimitiveRawValue>, mask: USSValue): boolean {
    const t = mask.type
    switch (t.type) {
        case 'boolean':
        case 'number':
        case 'string':
        case 'null':
            collectIn.add(mask.value as USSPrimitiveRawValue)
            return true
        case 'vector':
            const et = t.elementType
            if (et.type === 'elementOfEmptyVector') {
                // If the mask is an empty vector, we can just return true
                return true
            }
            const results = (mask.value as USSRawValue[]).map(x => collectUniqueMaskValues(collectIn, undocValue(x, et)))
            return results.every(x => x)
        case 'object':
        case 'function':
        case 'opaque':
            // We don't support objects or functions as masks, so we return false
            return false
    }
}

function repeatMany(value: USSValue, count: number): { type: 'success', value: USSValue & { type: USSVectorType } } | { type: 'error', message: string } {
    const vt = value.type
    if (vt.type === 'vector') {
        assert(value.value instanceof Array, 'unreachable')
        if (value.value.length !== count) {
            return { type: 'error', message: `Expected vector of length ${count}, but got ${value.value.length}` }
        }
        return { type: 'success', value: { type: vt, value: value.value } }
    }
    if (vt.type === 'object') {
        const newTypes = new Map<string, USSType>()
        const newProperties = new Map<string, USSRawValue[]>()
        for (const [k, v] of vt.properties.entries()) {
            assert(value.value instanceof Map, 'unreachable')
            const vVal = value.value.get(k)
            assert(vVal !== undefined, 'unreachable')
            const result = repeatMany(undocValue(vVal, v), count)
            if (result.type === 'error') {
                return result
            }
            assert(result.value.value instanceof Array, 'unreachable')
            assert(result.value.type.elementType.type !== 'elementOfEmptyVector', 'unreachable')
            newProperties.set(k, result.value.value)
            newTypes.set(k, result.value.type.elementType)
        }
        return {
            type: 'success',
            value: {
                type: { type: 'vector', elementType: { type: 'object', properties: newTypes } },
                value: Array.from({ length: count }, (_, idx) => new Map(Array.from(newProperties.entries()).map(([k, v]) => [k, v[idx]]))),
                documentation: value.documentation,
            },
        }
    }
    return {
        type: 'success',
        value: {
            type: { type: 'vector', elementType: value.type },
            value: Array.from({ length: count }, () => value.value),
            documentation: value.documentation,
        },
    }
}

function indexMaskComposite(value: USSValue, mask: USSValue, reference: USSPrimitiveRawValue): { type: 'success', value: USSValue & { type: USSVectorType } } | { type: 'error', message: string } {
    /**
     * Indexes the value using the mask. The mask is expected to be a vector of numbers, strings, or booleans.
     * If the mask is not a valid mask, an error is returned.
     */
    const valueType = value.type
    const maskType = mask.type
    switch (maskType.type) {
        case 'boolean':
        case 'number':
        case 'string':
        case 'null':
            const retval = mask.value === reference ? [value.value] : []
            return { type: 'success', value: { type: { type: 'vector', elementType: valueType }, value: retval, documentation: value.documentation } }
        case 'vector':
            const maskVector = mask.value as USSRawValue[]
            if (valueType.type !== 'vector') {
                const repeated = repeatMany(value, maskVector.length)
                if (repeated.type === 'error') {
                    return repeated
                }
                return indexMaskComposite(repeated.value, mask, reference)
            }
            const valueVector = value.value as USSRawValue[]
            if (maskVector.length !== valueVector.length) {
                return { type: 'error', message: `Mask length ${maskVector.length} does not match value length ${valueVector.length}` }
            }
            let referenceType: USSType | undefined | { type: 'elementOfEmptyVector' } = undefined
            const results: USSRawValue[] = []
            for (let i = 0; i < maskVector.length; i++) {
                assert(valueType.elementType.type !== 'elementOfEmptyVector', `Value element type cannot be elementOfEmptyVector, got ${renderType(valueType)}`)
                assert(maskType.elementType.type !== 'elementOfEmptyVector', `Mask element type cannot be elementOfEmptyVector, got ${renderType(maskType)}`)
                const resultsOrErr = indexMaskComposite(
                    { type: valueType.elementType, value: valueVector[i], documentation: value.documentation },
                    { type: maskType.elementType, value: maskVector[i], documentation: mask.documentation },
                    reference,
                )
                if (resultsOrErr.type === 'error') {
                    return resultsOrErr
                }
                results.push(...(resultsOrErr.value.value as USSRawValue[]))
                const elt = resultsOrErr.value.type.elementType
                referenceType = referenceType === undefined ? elt : unifyType(referenceType, elt, () => new Error('Should be unreachable'))
            }
            assert(referenceType !== undefined, 'already handled empty vector case')
            return { type: 'success', value: { type: { type: 'vector', elementType: referenceType }, value: results, documentation: value.documentation } }
        /* c8 ignore start */
        // If we reach here, it means the mask is not a valid mask. We checked for this earlier.
        case 'object':
        case 'function':
        case 'opaque':
            throw new Error('this case was already handled earlier, should not be reachable')
        /* c8 ignore stop */
    }
}

export function indexMask(value: USSValue, mask: USSValue, reference: USSPrimitiveRawValue): { type: 'success', value: USSValue } | { type: 'error', message: string } {
    switch (value.type.type) {
        case 'vector':
        case 'object':
            return indexMaskComposite(value, mask, reference)
        case 'number':
        case 'string':
        case 'boolean':
        case 'null':
        case 'opaque':
        case 'function':
            return { type: 'success', value }
    }
}

export function indexMaskIntoContext(
    env: Context,
    mask: USSValue,
    reference: USSPrimitiveRawValue,
): { type: 'success', value: Context } | { type: 'error', message: string } {
    /**
     * Indexes the mask into the context, returning a new context with the indexed values.
     * The mask is expected to be a vector of numbers, strings, or booleans.
     * If the mask is not a valid mask, an error is returned.
     * The reference is used to determine which values to keep in the context.
     */
    const newEnv = new Map<string, USSValue>()
    for (const [key, value] of env.variableEntries()) {
        const indexed = indexMask(value, mask, reference)
        if (indexed.type === 'error') {
            return { type: 'error', message: `Error indexing variable ${key}: ${indexed.message}` }
        }
        newEnv.set(key, indexed.value)
    }
    return {
        type: 'success',
        value: env.evolveVariables(newEnv),
    }
}

function index(v: USSValue, i: number): USSValue {
    const valueType = v.type
    if (valueType.type === 'vector') {
        const valueVector = v.value as USSRawValue[]
        assert (i >= 0 && i < valueVector.length, `Index ${i} out of bounds for vector of length ${valueVector.length}`)
        assert(valueType.elementType.type !== 'elementOfEmptyVector', `Unreachable: should have failed earlier if elementType was elementOfEmptyVector`)
        return { type: valueType.elementType, value: valueVector[i], documentation: v.documentation }
    }
    return v // If the value is not a vector, we just return it as is; broadcasting
}

function indexType(v: USSType): USSType {
    /**
     * Indexes the type of a value, returning the type of the indexed value.
     * If the value is not a vector, we just return the type as is.
     */
    if (v.type === 'vector') {
        assert(v.elementType.type !== 'elementOfEmptyVector', `Unreachable: should have failed earlier if elementType was elementOfEmptyVector`)
        return v.elementType
    }
    return v // If the value is not a vector, we just return it as is; broadcasting
}

function defaultValueForType(type: USSType): USSRawValue {
    switch (type.type) {
        case 'number':
            return NaN
        case 'string':
            return ''
        case 'boolean':
            return false
        case 'null':
            return null
        case 'vector':
            return []
        case 'object':
            return new Map<string, USSRawValue>([...type.properties.entries()].map(([k, v]) => [k, defaultValueForType(v)]))
        case 'function':
            return () => {
                throw new Error(`no default value for function type ${renderType(type)}`)
            }
        case 'opaque':
            throw new Error(`no default value for opaque type ${renderType(type)}`)
    }
}

type MergeResult = { type: 'success', value: USSValue } | { type: 'error', message: string }

function mergeValuesViaMasksSpecialCaseMap(
    values: USSValue[],
): MergeResult | undefined {
    /**
     * Special case for maps; we handle the case where exactly one value is present.
     */
    const nonNullValues = values.filter(x => x.type.type !== 'null')
    if (nonNullValues.length !== 1) {
        // If there are no non-null values or more than one, we cannot merge
        return undefined
    }
    const nonNullValue = nonNullValues[0]
    if (nonNullValue.type.type !== 'opaque' || (nonNullValue.type.name !== 'cMap' && nonNullValue.type.name !== 'pMap')) {
        // If the non-null value is not a map, this is not a special case we handle
        return undefined
    }
    return {
        type: 'success',
        value: nonNullValue,
    }
}

/**
 * Attempt to coerce the given value to the given type. This is used to ensure splitMask
 * does not change the type of the value when possible.
 */
function attemptCoerceToType(value: USSValue, toType: USSType): USSValue | undefined {
    if (renderType(value.type) === renderType(toType)) {
        // success!
        return value
    }
    if (value.type.type === 'vector') {
        const contents = value.value as USSRawValue[]
        if (contents.length > 0 && contents.every(x => x === contents[0])) {
            assert(value.type.elementType.type !== 'elementOfEmptyVector', `Unreachable: elementType was elementOfEmptyVector but contents is non-empty`)
            // all elements are the same, we can coerce
            return attemptCoerceToType({
                type: value.type.elementType,
                value: contents[0],
                documentation: value.documentation,
            }, toType)
        }
    }
    return undefined
}

export function mergeValuesViaMasks(
    values: USSValue[],
    mask: USSValue & { type: USSVectorType },
    references: USSPrimitiveRawValue[],
): MergeResult {
    // special cases
    const specialCase = mergeValuesViaMasksSpecialCaseMap(values)
    if (specialCase !== undefined) {
        return specialCase
    }

    const types = values.map(x => x.type).filter(x => x.type !== 'null').map(indexType)
    if (types.length === 0) {
        return { type: 'success', value: undocValue(null, { type: 'null' }) }
    }
    const firstType = types[0]
    if (types.some(x => renderType(x) !== renderType(firstType))) {
        const uniqueTypeReprs = Array.from(new Set(types.map(renderType))).sort()
        return { type: 'error', message: `Cannot merge values of different types: ${uniqueTypeReprs.join(', ')}` }
    }

    assert (values.length === references.length, `Expected the number of values (${values.length}) to match the number of references (${references.length})`)
    const mType = mask.type
    if (mType.elementType.type !== 'boolean' && mType.elementType.type !== 'number' && mType.elementType.type !== 'string') {
        return { type: 'error', message: `Cannot condition on a mask of type ${renderType(mType)}` }
    }
    const maskVector = mask.value as USSPrimitiveRawValue[]
    const indices = Array.from({ length: values.length }, () => 0)
    const result: (USSValue | undefined)[] = []
    for (let i = 0; i < maskVector.length; i++) {
        const whichValue = references.indexOf(maskVector[i])
        assert (whichValue !== -1, `Reference ${references[i]} not found in mask}`)
        // special case null values.
        result.push(values[whichValue].type.type === 'null' ? undefined : index(values[whichValue], indices[whichValue]))
        indices[whichValue]++
    }
    let defaultV: USSRawValue | undefined = undefined
    const finalRes = result.map(
        (x) => {
            if (x !== undefined) {
                return x.value
            }
            if (defaultV === undefined) {
                defaultV = defaultValueForType(firstType)
            }
            return defaultV satisfies USSRawValue
        },
    )
    const finalResValue = {
        type: { type: 'vector', elementType: types[0] },
        value: finalRes,
        documentation: values.find(x => x.documentation !== undefined)?.documentation,
    } satisfies USSValue
    return {
        type: 'success',
        value: attemptCoerceToType(finalResValue, firstType) ?? finalResValue,
    }
}

export function splitMask(env: Context, mask: USSValue, fn: (value: USSValue, subEnv: Context) => USSValue, errLocCondition: LocInfo, errLocIf: LocInfo): USSValue {
    /**
     * Splits the mask into its unique values and applies the function to each value.
     * The function is expected to return a USSValue.
     * If the mask is not a valid mask, an error is thrown.
     */
    const collectIn = new Set<USSPrimitiveRawValue>()
    if (!collectUniqueMaskValues(collectIn, mask)) {
        throw env.error(`Conditional mask must be a vector of numbers, strings, or booleans, but got ${renderType(mask.type)}`, errLocCondition)
    }
    const uniqueValueArray = Array.from(collectIn).sort((a, b) => {
        // stringify the values to compare them
        const sa = JSON.stringify(a)
        const sb = JSON.stringify(b)
        if (sa < sb) return -1
        if (sa > sb) return 1
        return 0
    })
    if (uniqueValueArray.length === 0) {
        throw env.error(`Conditional mask must have at least one unique value, but got none`, errLocCondition)
    }
    const maskType = mask.type
    if (uniqueValueArray.length === 1) {
        // if there is only one unique value, we can just return the result of the function
        return fn({ type: getPrimitiveType(uniqueValueArray[0]), value: uniqueValueArray[0], documentation: mask.documentation }, env)
    }
    assert(maskType.type === 'vector', 'unreachable')
    const outEnvsValues = uniqueValueArray.map((value) => {
        const subEnv = indexMaskIntoContext(env, mask, value)
        if (subEnv.type === 'error') {
            throw env.error(`Conditional error: ${subEnv.message}`, errLocCondition)
        }
        assert(maskType.elementType.type !== 'elementOfEmptyVector', `Unreachable: should have failed earlier if elementType was elementOfEmptyVector`)
        const result = fn({ type: getPrimitiveType(value), value, documentation: mask.documentation }, subEnv.value)
        return [result, subEnv.value] satisfies [USSValue, Context]
    })
    const newVars = new Map<string, USSValue>()
    const allKeys = new Set<string>()
    for (const [, subEnv] of outEnvsValues) {
        for (const [k] of subEnv.variableEntries()) {
            allKeys.add(k)
        }
    }
    for (const k of allKeys) {
        const values = outEnvsValues.map(([, subEnv]) => subEnv.getVariable(k) ?? undocValue(null, { type: 'null' }) satisfies USSValue)
        assert(mask.type.type === 'vector', 'unreachable')
        const merged = mergeValuesViaMasks(values, mask as USSValue & { type: USSVectorType }, uniqueValueArray)
        if (merged.type === 'error') {
            throw env.error(`Error merging values for variable ${k}: ${merged.message}`, errLocIf)
        }
        if (merged.value.type.type === 'null') {
            // If the merged value is null, we don't add it to the new variables
            continue
        }
        newVars.set(k, merged.value)
    }
    for (const [k, v] of newVars.entries()) {
        const err = env.assignVariable(k, v)
        assert(err === undefined, `Error assigning variable ${k}: ${err}`)
    }
    const mergedValues = mergeValuesViaMasks(
        outEnvsValues.map(([v]) => v),
        mask as USSValue & { type: USSVectorType },
        uniqueValueArray,
    )
    if (mergedValues.type === 'error') {
        // If the types do not match, return null
        return undocValue(null, { type: 'null' })
    }
    return mergedValues.value
}
