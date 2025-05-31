import { Context } from './interpreter'

interface USSNumberType {
    type: 'number'
}

interface USSStringType {
    type: 'string'
}
interface USSBooleanType {
    type: 'boolean'
}

interface USSVectorType {
    type: 'vector'
    elementType: USSType
}

interface USSObjectType {
    type: 'object'
    properties: Record<string, USSType>
}

interface USSFunctionType {
    type: 'function'
    posArgs: USSType[]
    namedArgs: Record<string, USSType>
    returnType: USSType
}

export type USSType = (
    USSNumberType
    | USSStringType
    | USSBooleanType
    | USSObjectType
    | USSVectorType
    | USSFunctionType
)

export type USSPrimitiveRawValue = (
    number |
    string |
    boolean
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

interface BroadcastError {
    type: 'error'
    message: string
}

type TypeLocationSuccess = [number[], USSType, USSRawValue]
type TypeLocationResult = { type: 'success', result: TypeLocationSuccess } | BroadcastError

export function locateType(value: USSValue, predicate: (t: USSType) => boolean, predicateDescriptor: string): TypeLocationResult {
    if (predicate(value.type)) {
        // cast is safe because we checked the type
        return { type: 'success', result: [[], value.type, value.value] }
    }
    const overallType = value.type
    if (overallType.type === 'vector') {
        return locateTypeVector(value as USSValue & { type: USSVectorType }, predicate, predicateDescriptor)
    }
    if (overallType.type === 'object' && Object.values(overallType.properties).some(t => t.type === 'vector')) {
        return locateTypeObject(value as USSValue & { type: USSObjectType }, predicate, predicateDescriptor)
    }
    return {
        type: 'error',
        message: `Expected a vector, or vector of ${predicateDescriptor} but got ${renderType(value.type)}`,
    }
}

function locateTypeVector(
    value: USSValue & { type: USSVectorType },
    predicate: (t: USSType) => boolean,
    predicateDescriptor: string,
): TypeLocationResult {
    const subtypesOrErrors = (value as { type: USSVectorType, value: USSRawValue[] }).value.map(fn => locateType({
        type: value.type.elementType,
        value: fn,
    }, predicate, predicateDescriptor))
    if (subtypesOrErrors.some(x => x.type === 'error')) {
        return subtypesOrErrors.find(x => x.type === 'error')!
    }
    const subresults = (subtypesOrErrors as { type: 'success', result: TypeLocationSuccess }[]).map(x => x.result)
    const prefixes = subresults.map(x => x[0])
    const types = subresults.map(x => x[1])
    const values = subresults.map(x => x[2])
    if (prefixes.some(x => JSON.stringify(x) !== JSON.stringify(prefixes[0]))) {
        return {
            type: 'error',
            message: `Ragged array cannot be broadcasted`,
        }
    }
    if (types.some(x => JSON.stringify(x) !== JSON.stringify(types[0]))) {
        return {
            type: 'error',
            message: `Array of different types cannot be broadcasted: ${types.map(renderType).join(', ')}`,
        }
    }
    return { type: 'success', result: [[prefixes.length, ...prefixes[0]], types[0], values] }
}

function locateTypeObject(
    value: USSValue & { type: USSObjectType },
    predicate: (t: USSType) => boolean,
    predicateDescriptor: string,
): TypeLocationResult {
    const toBroadcast = Object.entries(value.type.properties).filter(([, t]) => t.type === 'vector').map(([k]) => k)
    if (toBroadcast.length === 0) {
        throw new Error(`Expected an object with at least one vector property, but got ${renderType(value.type)}`)
    }
    const rawValue = value.value as Map<string, USSRawValue>
    const firstDims = toBroadcast.map((k) => {
        const subValue = rawValue.get(k)
        if (subValue === undefined) {
            throw new Error(`Expected object to have property ${k}, but it is undefined`)
        }
        if (typeof subValue !== 'object' || !Array.isArray(subValue)) {
            throw new Error(`Expected object property ${k} to be a vector, but got ${typeof subValue}`)
        }
        return subValue.length
    })
    if (firstDims.some(x => x !== firstDims[0])) {
        return {
            type: 'error',
            message: `Object properties ${toBroadcast.join(', ')} have different lengths, cannot be broadcasted`,
        }
    }
    const newRawValues: Map<string, USSRawValue>[] = []
    for (let i = 0; i < firstDims[0]; i++) {
        const newRawValue = new Map<string, USSRawValue>()
        for (const k of rawValue.keys()) {
            if (!toBroadcast.includes(k)) {
                newRawValue.set(k, rawValue.get(k))
                continue
            }
            const subValue = rawValue.get(k)
            if (subValue === undefined || !Array.isArray(subValue)) {
                throw new Error(`Expected object to have property ${k} as a vector, but it is undefined or not a vector`)
            }
            newRawValue.set(k, subValue[i])
        }
        newRawValues.push(newRawValue)
    }
    return locateType({
        value: newRawValues,
        type: {
            type: 'vector',
            elementType: {
                type: 'object',
                properties: Object.fromEntries(
                    Object.entries(value.type.properties).map(
                        ([k, t]) => [
                            k,
                            (toBroadcast.includes(k)
                                ? (t as USSVectorType).elementType
                                : t
                            ) satisfies USSType,
                        ],
                    ),
                ),
            },
        },
    }, predicate, predicateDescriptor)
}

export function locateFunctionAndArguments(
    fn: USSValue,
    posArgs: USSValue[],
    kwArgs: [string, USSValue][],
): { type: 'success', result: [TypeLocationSuccess, TypeLocationSuccess[], TypeLocationSuccess[]] } | BroadcastError {
    const fnLocatedOrError = locateType(fn, t => t.type === 'function', 'function')
    if (fnLocatedOrError.type === 'error') {
        return fnLocatedOrError
    }
    const fnLocated = fnLocatedOrError.result
    const fnType = fnLocated[1]
    if (fnType.type !== 'function') {
        throw new Error(`Expected a function type, but got ${renderType(fnType)}`)
    }
    if (fnType.posArgs.length !== posArgs.length) {
        return {
            type: 'error',
            message: `Function expects ${fnType.posArgs.length} positional arguments, but received ${posArgs.length}`,
        }
    }
    if (JSON.stringify(Object.keys(fnType.namedArgs).sort()) !== JSON.stringify(kwArgs.map(x => x[0]).sort())) {
        return {
            type: 'error',
            message: `Function expects arguments named ${Object.keys(fnType.namedArgs).join(', ')}, but received ${kwArgs.map(x => x[0]).join(', ')}`,
        }
    }
    const posArgsLocated: TypeLocationSuccess[] = []
    for (let i = 0; i < fnType.posArgs.length; i++) {
        const posArgLocated = locateType(posArgs[i], t => renderType(t) === renderType(fnType.posArgs[i]), `positional argument ${i + 1} of type ${renderType(fnType.posArgs[i])}`)
        if (posArgLocated.type === 'error') {
            return posArgLocated
        }
        posArgsLocated.push(posArgLocated.result)
    }

    const kwArgsLocated: TypeLocationSuccess[] = []
    for (const [name, value] of kwArgs) {
        const kwArgLocated = locateType(value, t => renderType(t) === renderType(fnType.namedArgs[name]), `named argument ${name} of type ${renderType(fnType.namedArgs[name])}`)
        if (kwArgLocated.type === 'error') {
            return kwArgLocated
        }
        kwArgsLocated.push(kwArgLocated.result)
    }
    return {
        type: 'success',
        result: [fnLocated, posArgsLocated, kwArgsLocated],
    }
}

function expandDims(values: TypeLocationSuccess[], descriptors: string[]): { type: 'success', result: TypeLocationSuccess[] } | BroadcastError {
    /**
     * Expands the dimensions of the given values to the largest vector size, aligning the last axes.
     * This is used to prepare the values for broadcasting.
     */
    let maximalExpansionSize: number[] = []
    let maximalExpansionIdx = -1
    for (let i = 0; i < values.length; i++) {
        const [prefix] = values[i]
        if (prefix.length > maximalExpansionSize.length) {
            maximalExpansionSize = prefix
            maximalExpansionIdx = i
        }
    }
    for (let i = 0; i < values.length; i++) {
        const [prefix] = values[i]
        const off = maximalExpansionSize.length - prefix.length
        if (!prefix.every((x, j) => x === maximalExpansionSize[j + off])) {
            return {
                type: 'error',
                message: `Cannot broadcast ${descriptors[i]} with prefix ${prefix.join(', ')} to shaape ${maximalExpansionSize.join(', ')} of ${descriptors[maximalExpansionIdx]}`,
            }
        }
    }
    const newValues: TypeLocationSuccess[] = values.map((value) => {
        const [prefix, type, rawValue] = value

        return [maximalExpansionSize, type, addAdditionalDims(maximalExpansionSize.slice(0, maximalExpansionSize.length - prefix.length), rawValue)]
    })
    return { type: 'success', result: newValues }
}

function addAdditionalDims(dims: number[], rawValue: USSRawValue): USSRawValue {
    /**
     * Expands the dimensions of the given raw value to the given dimensions.
     * This is used to prepare the values for broadcasting.
     */
    if (dims.length === 0) {
        return rawValue
    }
    return addAdditionalDims(
        dims.slice(0, dims.length - 1),
        Array.from({ length: dims[dims.length - 1] }, () => rawValue),
    )
}

function mapSeveral(
    fn: USSRawValue,
    posArgs: USSRawValue[],
    argumentNames: string[],
    kwArgs: USSRawValue[],
    depth: number,
    ctx: Context,
): USSRawValue {
    /**
     * Maps the given function to the positional and keyword arguments, returning a new value.
     * The function is expected to be a function that takes the positional and keyword arguments.
     */
    if (depth === 0) {
        if (typeof fn !== 'function') {
            throw new Error(`Expected a function, but got ${typeof fn}`)
        }
        return (fn as (c: Context, pA: USSRawValue[], nA: Record<string, USSRawValue>) => USSRawValue)(
            ctx, posArgs, Object.fromEntries(kwArgs.map((v, i) => [argumentNames[i], v])),
        )
    }
    if (!Array.isArray(fn)) {
        throw new Error(`Expected an array of functions, but got ${typeof fn}`)
    }
    return Array.from({ length: fn.length }, (_, i) => {
        const posArgsI = posArgs.map((x) => {
            if (!Array.isArray(x)) {
                throw new Error(`Expected an array of positional arguments, but got ${typeof x}`)
            }
            return x[i]
        })
        const kwArgsI = kwArgs.map((x) => {
            if (!Array.isArray(x)) {
                throw new Error(`Expected an array of keyword arguments, but got ${typeof x}`)
            }
            return x[i]
        })
        return mapSeveral(
            fn[i],
            posArgsI,
            argumentNames,
            kwArgsI,
            depth - 1,
            ctx,
        )
    })
}

function nestedVectorType(type: USSType, depth: number): USSType {
    if (depth === 0) {
        return type
    }
    return {
        type: 'vector',
        elementType: nestedVectorType(type, depth - 1),
    }
}

export function broadcastApply(fn: USSValue, posArgs: USSValue[], kwArgs: [string, USSValue][], ctx: Context): { type: 'success', result: USSValue } | BroadcastError {
    /**
     * Broadcasts a function to the given arguments. The function itself can be a vector, but the types
     * of the functions must all be the same.
     *
     * Broadcasting works by expanding values to the largest vector size, and then zippering the computation
     * across the vectors. The last axes are always preferentially aligned, i.e.,
     *
     * [f, g]([[1, 2], [3, 4]]) => [[f(1), g(3)], [f(2), g(4)]]
     *
     * If the function cannot be broadcast to the arguments, an error is returned.
     */

    const result = locateFunctionAndArguments(fn, posArgs, kwArgs)
    if (result.type === 'error') {
        return result
    }
    let [fnLocated, posArgsLocated, kwArgsLocated] = result.result
    let allTogether = [fnLocated, ...posArgsLocated, ...kwArgsLocated]
    const descriptors = ['function', ...posArgsLocated.map((x, i) => `positional argument ${i + 1}`), ...kwArgsLocated.map(x => `named argument ${x[0]}`)]
    const allTogetherOrErr = expandDims(allTogether, descriptors)
    if (allTogetherOrErr.type === 'error') {
        return allTogetherOrErr
    }
    allTogether = allTogetherOrErr.result
    // console.log('allTogether', allTogether)
    fnLocated = allTogether[0]
    posArgsLocated = allTogether.slice(1, 1 + posArgsLocated.length)
    kwArgsLocated = allTogether.slice(1 + posArgsLocated.length)
    const depth = fnLocated[0].length

    const resulting: USSRawValue = mapSeveral(
        fnLocated[2],
        posArgsLocated.map(x => x[2]),
        kwArgs.map(x => x[0]),
        kwArgsLocated.map(x => x[2]),
        depth,
        ctx,
    )

    // console.log('resulting', resulting, 'fnLocated', fnLocated, 'posArgsLocated', posArgsLocated, 'kwArgsLocated', kwArgsLocated)

    return {
        type: 'success',
        result: {
            type: nestedVectorType((fnLocated[1] as USSFunctionType).returnType, depth),
            value: resulting,
        },
    }
}

export function broadcastCall(fn: USSValue, args: ValueArg[], ctx: Context): { type: 'success', result: USSValue } | BroadcastError {
    /**
     * Broadcasts a function to the given arguments. The function itself can be a vector, but the types
     * of the functions must all be the same.
     *
     * Broadcasting works by expanding values to the largest vector size, and then zippering the computation
     * across the vectors. The last axes are always preferentially aligned, i.e.,
     *
     * [f, g]([[1, 2], [3, 4]]) => [[f(1), g(3)], [f(2), g(4)]]
     *
     * If the function cannot be broadcast to the arguments, an error is returned.
     */

    const posArgs = args.filter(x => x.type === 'unnamed').map(x => x.value)
    const kwArgs = args.filter(x => x.type === 'named').map(x => [x.name, x.value] satisfies [string, USSValue])
    return broadcastApply(fn, posArgs, kwArgs, ctx)
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
        case 'vector':
            return []
        case 'object':
            return new Map<string, USSRawValue>(Object.entries(type.properties).map(([k, v]) => [k, defaultValueForType(v)]))
        case 'function':
            return () => defaultValueForType(type.returnType) // Default function returns undefined
    }
}

export function mergeValuesViaMasks(
    values: (USSValue | undefined)[],
    mask: USSValue,
    references: USSPrimitiveRawValue[],
): { type: 'success', value: USSValue | undefined } | { type: 'error', message: string } {
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
        // console.log(whichValue)
        // console.log('values', values[whichValue])
        // console.log('indices', indices[whichValue])
        result.push(values[whichValue] === undefined ? undefined : index(values[whichValue], indices[whichValue]))
        indices[whichValue]++
    }
    const types = result.filter(x => x !== undefined).map(x => x.type)
    if (types.length === 0) {
        return { type: 'success', value: undefined }
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
