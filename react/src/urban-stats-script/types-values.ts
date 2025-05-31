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

export type USSFunctionArgType = { type: 'concrete', value: USSType } | { type: 'anyPrimitive' }
export type USSFunctionReturnType = { type: 'concrete', value: USSType } | { type: 'inferFromPrimitive' }

export interface USSFunctionType {
    type: 'function'
    posArgs: USSFunctionArgType[]
    namedArgs: Record<string, USSFunctionArgType>
    returnType: USSFunctionReturnType
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
        return `[${renderType(type.elementType)}]`
    }
    if (type.type === 'object') {
        return `{${Object.entries(type.properties).map(([k, v]) => `${k}: ${renderType(v)}`).join(', ')}}`
    }
    if (type.type === 'null') {
        return 'null'
    }
    return `(${type.posArgs.map(renderArgumentType).join(', ')}; ${Object.entries(type.namedArgs).map(([k, v]) => `${k}: ${renderArgumentType(v)}`).join(', ')}) -> ${renderReturnType(type.returnType)}`
}

export function renderArgumentType(arg: USSFunctionArgType): string {
    if (arg.type === 'concrete') {
        return renderType(arg.value)
    }
    return 'any'
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
