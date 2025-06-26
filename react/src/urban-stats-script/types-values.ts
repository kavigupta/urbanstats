import { assert } from '../utils/defensive'

import { Context } from './context'

interface USSNumberType {
    type: 'number'
}

interface USSStringType {
    type: 'string'
}
interface USSBooleanType {
    type: 'boolean'
}

interface USSNullType {
    type: 'null'
}

export interface USSOpaqueType {
    type: 'opaque'
    name: string
}

export interface USSVectorType {
    type: 'vector'
    elementType: USSType | { type: 'elementOfEmptyVector' }
}

export interface USSObjectType {
    type: 'object'
    properties: Map<string, USSType>
}

export type USSFunctionArgType = { type: 'concrete', value: USSType } | { type: 'anyPrimitive' }
export type USSFunctionReturnType = { type: 'concrete', value: USSType } | { type: 'inferFromPrimitive' }

export interface USSFunctionType {
    type: 'function'
    posArgs: USSFunctionArgType[]
    namedArgs: Record<string, { type: USSFunctionArgType, defaultValue?: USSRawValue }>
    returnType: USSFunctionReturnType
}

export type USSType = (
    USSNumberType
    | USSStringType
    | USSBooleanType
    | USSNullType
    | USSOpaqueType
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

export interface OriginalFunctionArgs {
    posArgs: USSValue[]
    namedArgs: Record<string, USSValue>
}

export type USSRawValue = (
    USSPrimitiveRawValue |
    USSRawValue[] |
    Map<string, USSRawValue> |
    (
        (
            ctx: Context,
            posArgs: USSRawValue[],
            namedArgs: Record<string, USSRawValue>,
            // only used occasionally, for functions that need to access the original arguments
            // to e.g., access their documentation
            originalArgs: OriginalFunctionArgs
        ) => USSRawValue
    ) |
    { type: 'opaque', value: object }
)

export interface Documentation {
    humanReadableName: string
}

export interface USSDocumentedType {
    type: USSType
    documentation?: Documentation

}

export type USSValue = { value: USSRawValue } & USSDocumentedType

export function undocValue(value: USSRawValue, type: USSType): USSValue {
    return {
        type,
        value,
        documentation: undefined,
    }
}

export function unifyFunctionType(param: USSFunctionArgType, arg: USSType): boolean {
    if (param.type === 'concrete') {
        return renderType(param.value) === renderType(arg)
    }
    return arg.type === 'number' || arg.type === 'string' || arg.type === 'boolean' || arg.type === 'null'
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
        return `[${type.elementType.type === 'elementOfEmptyVector' ? '' : renderType(type.elementType)}]`
    }
    if (type.type === 'object') {
        return `{${[...type.properties.entries()].sort().map(([k, v]) => `${k}: ${renderType(v)}`).join(', ')}}`
    }
    if (type.type === 'null') {
        return 'null'
    }
    if (type.type === 'opaque') {
        return type.name
    }
    return `(${type.posArgs.map(renderArgumentType).join(', ')}; ${Object.entries(type.namedArgs).map(([k, v]) => `${k}: ${renderKwargType(v)}`).join(', ')}) -> ${renderReturnType(type.returnType)}`
}

export function renderArgumentType(arg: USSFunctionArgType): string {
    if (arg.type === 'concrete') {
        return renderType(arg.value)
    }
    return 'any'
}

export function renderKwargType(arg: { type: USSFunctionArgType, defaultValue?: USSRawValue }): string {
    const type = renderArgumentType(arg.type)
    if (arg.defaultValue !== undefined) {
        return `${type} = ${JSON.stringify(arg.defaultValue)}`
    }
    return type
}

function renderReturnType(ret: USSFunctionReturnType): string {
    if (ret.type === 'concrete') {
        return renderType(ret.value)
    }
    return 'any'
}

export type ValueArg = (
    { type: 'unnamed', value: USSValue } |
    { type: 'named', name: string, value: USSValue }
)

export function getPrimitiveType(value: USSRawValue, depth: number = 0): USSType {
    if (depth === 0) {
        if (typeof value === 'number') {
            return { type: 'number' }
        }
        if (typeof value === 'string') {
            return { type: 'string' }
        }
        if (typeof value === 'boolean') {
            return { type: 'boolean' }
        }
        if (value === null) {
            return { type: 'null' }
        }
    }
    assert(Array.isArray(value), `Expected a primitive value, but got ${typeof value}`)
    return getPrimitiveType(value[0], depth - 1)
}

export function unifyType(
    a: USSType | { type: 'elementOfEmptyVector' },
    b: USSType | { type: 'elementOfEmptyVector' },
    error: () => Error,
): USSType | { type: 'elementOfEmptyVector' } {
    if (a.type === 'elementOfEmptyVector') {
        return b
    }
    if (b.type === 'elementOfEmptyVector') {
        return a
    }
    if (renderType(a) === renderType(b)) {
        return a
    }
    if (a.type === 'vector' && b.type === 'vector') {
        return {
            type: 'vector',
            elementType: unifyType(a.elementType, b.elementType, error),
        }
    }
    if (a.type === 'object' && b.type === 'object') {
        if (JSON.stringify([...a.properties.keys()].sort()) !== JSON.stringify([...b.properties.keys()].sort())) {
            throw error()
        }
        const properties = new Map<string, USSType>()
        for (const [key, type] of a.properties) {
            properties.set(key, type)
        }
        for (const [key, type] of b.properties) {
            const res = unifyType(properties.get(key)!, type, error)
            assert(res.type !== 'elementOfEmptyVector', `Unreachable`)
            properties.set(key, res)
        }
        return {
            type: 'object',
            properties,
        }
    }
    throw error()
}

export function renderValue(input: USSValue): string {
    function helper(value: USSValue, indent: string): string {
        const type = value.type
        switch (type.type) {
            case 'boolean':
            case 'null':
            case 'number':
                return `${value.value}`
            case 'string':
                return `"${value.value}"`
            case 'opaque':
                return JSON.stringify((value.value as { type: 'opaque', value: object }).value)
            case 'vector':
                const vector = value.value as USSRawValue[]
                if (vector.length === 0) {
                    return `[]`
                }
                // USSType assertion is OK since we handle zero-length vectors above
                return `[
${vector.map(element => `${indent}    ${helper(undocValue(element, type.elementType as USSType), `${indent}    `)}`).join(',\n')}
${indent}]`
            case 'object':
                const map = value.value as Map<string, USSRawValue>
                if (map.size === 0) {
                    return `{}`
                }
                return `{
${Array.from(map.entries()).map(([key, element]) => `${indent}    ${key}: ${helper(undocValue(element, type.properties.get(key)!), `${indent}    `)}`).join(',\n')}
${indent}}`
            case 'function':
                return renderType(type)
        }
    }
    return helper(input, '')
}
