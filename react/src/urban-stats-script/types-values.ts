import { Context } from './interpreter'
import { LocInfo } from './lexer'

interface USSNumberType {
    type: 'number'
}

interface USSStringType {
    type: 'string'
}
interface USSBooleanType {
    type: 'boolean'
}

export interface USSVectorType {
    type: 'vector'
    elementType: USSType
}

interface USSNullType {
    type: 'null'
}

export interface USSObjectType {
    type: 'object'
    properties: Record<string, USSType>
}

export interface USSFunctionType {
    type: 'function'
    posArgs: USSType[]
    namedArgs: Record<string, USSType>
    returnType: USSType
}

export type USSType = (
    USSNumberType
    | USSStringType
    | USSBooleanType
    | USSNullType
    | USSObjectType
    | USSVectorType
    | USSFunctionType
)

export type USSPrimitiveRawValue = (
    number |
    string |
    boolean |
    null
)

export type USSRawValue = (
    USSPrimitiveRawValue |
    USSRawValue[] |
    Map<string, USSRawValue> |
    (
        (
            ctx: Context,
            posArgs: USSRawValue[],
            namedArgs: Record<string, USSRawValue>,
        ) => USSRawValue
    )
)

export interface USSValue {
    type: USSType
    value: USSRawValue
}

export function renderType(type: USSType): string {
    if (type.type === 'number') {
        return 'number'
    }
    if (type.type === 'string') {
        return 'string'
    }
    if (type.type === 'boolean') {
        return 'boolean'
    }
    if (type.type === 'vector') {
        return `[${renderType(type.elementType)}]`
    }
    if (type.type === 'object') {
        return `{${Object.entries(type.properties).map(([k, v]) => `${k}: ${renderType(v)}`).join(', ')}}`
    }
    if (type.type === 'null') {
        return 'null'
    }
    return `(${type.posArgs.map(renderType).join(', ')}; ${Object.entries(type.namedArgs).map(([k, v]) => `${k}: ${renderType(v)}`).join(', ')}) -> ${renderType(type.returnType)}`
}

export type ValueArg = (
    { type: 'unnamed', value: USSValue } |
    { type: 'named', name: string, value: USSValue }
)

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
            const results = (mask.value as USSRawValue[]).map(x => collectUniqueMaskValues(collectIn, { type: t.elementType, value: x }))
            return results.every(x => x)
        case 'object':
        case 'function':
            // We don't support objects or functions as masks, so we return false
            return false
    }
}

function repeatMany(value: USSValue, count: number): USSValue & { type: USSVectorType } {
    return {
        type: { type: 'vector', elementType: value.type },
        value: Array.from({ length: count }, () => value.value),
    }
}

export function indexMask(value: USSValue, mask: USSValue, reference: USSPrimitiveRawValue): { type: 'success', value: USSValue & { type: USSVectorType } } | { type: 'error', message: string } {
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
            return { type: 'success', value: { type: { type: 'vector', elementType: valueType }, value: retval } }
        case 'vector':
            const maskVector = mask.value as USSRawValue[]
            if (valueType.type !== 'vector') {
                return indexMask(repeatMany(value, maskVector.length), mask, reference)
            }
            const valueVector = value.value as USSRawValue[]
            if (maskVector.length !== valueVector.length) {
                return { type: 'error', message: `Mask length ${maskVector.length} does not match value length ${valueVector.length}` }
            }
            let referenceType: USSType | undefined = undefined
            const results: USSRawValue[] = []
            for (let i = 0; i < maskVector.length; i++) {
                const resultsOrErr = indexMask(
                    { type: valueType.elementType, value: valueVector[i] },
                    { type: maskType.elementType, value: maskVector[i] },
                    reference,
                )
                if (resultsOrErr.type === 'error') {
                    return resultsOrErr
                }
                results.push(...(resultsOrErr.value.value as USSRawValue[]))
                referenceType = resultsOrErr.value.type.elementType
            }
            if (referenceType === undefined) {
                return { type: 'error', message: `Mask is empty, cannot index value ${renderType(maskType)}` }
            }
            return { type: 'success', value: { type: { type: 'vector', elementType: referenceType }, value: results } }
        case 'object':
            return { type: 'error', message: `Cannot index with an object mask, got ${renderType(maskType)}` }
        case 'function':
            return { type: 'error', message: `Cannot index with a function mask, got ${renderType(maskType)}` }
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
    for (const [key, value] of env.variables.entries()) {
        const indexed = indexMask(value, mask, reference)
        if (indexed.type === 'error') {
            return { type: 'error', message: `Error indexing variable ${key}: ${indexed.message}` }
        }
        newEnv.set(key, indexed.value)
    }
    return {
        type: 'success',
        value: {
            ...env,
            variables: newEnv,
        },
    }
}

function index(v: USSValue, i: number): USSValue {
    const valueType = v.type
    if (valueType.type === 'vector') {
        const valueVector = v.value as USSRawValue[]
        if (i < 0 || i >= valueVector.length) {
            throw new Error(`Index ${i} out of bounds for vector of length ${valueVector.length}`)
        }
        return { type: valueType.elementType, value: valueVector[i] }
    }
    return v // If the value is not a vector, we just return it as is; broadcasting
}

function defaultValueForType(type: USSType): USSRawValue {
    switch (type.type) {
        case 'number':
            return 0
        case 'string':
            return ''
        case 'boolean':
            return false
        case 'null':
            return null
        case 'vector':
            return []
        case 'object':
            return new Map<string, USSRawValue>(Object.entries(type.properties).map(([k, v]) => [k, defaultValueForType(v)]))
        case 'function':
            return () => defaultValueForType(type.returnType) // Default function returns undefined
    }
}

export function mergeValuesViaMasks(
    values: USSValue[],
    mask: USSValue,
    references: USSPrimitiveRawValue[],
): { type: 'success', value: USSValue } | { type: 'error', message: string } {
    if (values.length !== references.length) {
        throw new Error(`Expected the number of values (${values.length}) to match the number of references (${references.length})`)
    }
    const mType = mask.type
    if (mType.type !== 'vector') {
        return { type: 'error', message: `Expected a vector mask, but got ${renderType(mType)}` }
    }
    if (mType.elementType.type !== 'boolean' && mType.elementType.type !== 'number' && mType.elementType.type !== 'string') {
        return { type: 'error', message: `Cannot condition on a mask of type ${renderType(mType)}` }
    }
    const maskVector = mask.value as USSPrimitiveRawValue[]
    const indices = Array.from({ length: values.length }, () => 0)
    const result: (USSValue | undefined)[] = []
    for (let i = 0; i < maskVector.length; i++) {
        const whichValue = references.indexOf(maskVector[i])
        if (whichValue === -1) {
            return { type: 'error', message: `Reference ${references[i]} not found in mask ${maskVector.map(x => JSON.stringify(x)).join(', ')}` }
        }
        // special case null values.
        result.push(values[whichValue].type.type === 'null' ? undefined : index(values[whichValue], indices[whichValue]))
        indices[whichValue]++
    }
    const types = result.filter(x => x !== undefined).map(x => x.type)
    if (types.length === 0) {
        return { type: 'success', value: { type: { type: 'null' }, value: null } }
    }
    const firstType = types[0]
    if (types.some(x => renderType(x) !== renderType(firstType))) {
        const uniqueTypeReprs = Array.from(new Set(types.map(renderType))).sort()
        return { type: 'error', message: `Cannot merge values of different types: ${uniqueTypeReprs.join(', ')}` }
    }
    const finalRes = result.map(
        x => x ? x.value : defaultValueForType(firstType),
    )
    return {
        type: 'success',
        value: {
            type: { type: 'vector', elementType: types[0] },
            value: finalRes,
        },
    }
}

export function splitMask(env: Context, mask: USSValue, fn: (value: USSValue, subEnv: Context) => USSValue, errLoc: LocInfo): USSValue {
    /**
     * Splits the mask into its unique values and applies the function to each value.
     * The function is expected to return a USSValue.
     * If the mask is not a valid mask, an error is thrown.
     */
    const collectIn = new Set<USSPrimitiveRawValue>()
    if (!collectUniqueMaskValues(collectIn, mask)) {
        throw env.error(`Conditional mask must be a vector of numbers, strings, or booleans, but got ${renderType(mask.type)}`, errLoc)
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
        throw env.error(`Conditional mask must have at least one unique value, but got none`, errLoc)
    }
    if (uniqueValueArray.length === 1) {
        // if there is only one unique value, we can just return the result of the function
        return fn({ type: mask.type, value: uniqueValueArray[0] }, env)
    }
    const outEnvsValues = uniqueValueArray.map((value) => {
        const subEnv = indexMaskIntoContext(env, mask, value)
        if (subEnv.type === 'error') {
            throw env.error(`Error indexing mask into context: ${subEnv.message}`, errLoc)
        }
        return [fn({ type: mask.type, value }, subEnv.value), subEnv.value] satisfies [USSValue, Context]
    })
    const newVars = new Map<string, USSValue>()
    const allKeys = new Set<string>()
    for (const [, subEnv] of outEnvsValues) {
        for (const k of subEnv.variables.keys()) {
            allKeys.add(k)
        }
    }
    for (const k of allKeys) {
        const values = outEnvsValues.map(([, subEnv]) => subEnv.variables.get(k) ?? { type: { type: 'null' }, value: null } satisfies USSValue)
        const merged = mergeValuesViaMasks(values, mask, uniqueValueArray)
        if (merged.type === 'error') {
            throw env.error(`Error merging values for variable ${k}: ${merged.message}`, errLoc)
        }
        if (merged.value.type.type === 'null') {
            // If the merged value is null, we don't add it to the new variables
            continue
        }
        newVars.set(k, merged.value)
    }
    env.variables = newVars
    const mergedValues = mergeValuesViaMasks(
        outEnvsValues.map(([v]) => v),
        mask,
        uniqueValueArray,
    )
    if (mergedValues.type === 'error') {
        throw env.error(`Error merging values: ${mergedValues.message}`, errLoc)
    }
    return mergedValues.value
}
