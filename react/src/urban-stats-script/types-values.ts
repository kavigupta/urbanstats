import { Basemap } from '../mapper/settings/utils'
import { assert } from '../utils/defensive'

import { UrbanStatsASTExpression } from './ast'
import { Color } from './constants/color'
import { CMap, Outline, PMap } from './constants/map'
import { RampT } from './constants/ramp'
import { Scale } from './constants/scale'
import { Context } from './context'
import { unparse } from './parser'

// Define Inset and Insets types locally to avoid import issues
interface Inset { bottomLeft: [number, number], topRight: [number, number], coordBox?: [number, number, number, number], mainMap: boolean, name?: string }
type Insets = Inset[]

// Define the tagged union for opaque values
export type USSOpaqueValue =
    | { type: 'opaque', opaqueType: 'color', value: Color }
    | { type: 'opaque', opaqueType: 'scale', value: Scale }
    | { type: 'opaque', opaqueType: 'inset', value: Inset }
    | { type: 'opaque', opaqueType: 'insets', value: Insets }
    | { type: 'opaque', opaqueType: 'cMap', value: CMap }
    | { type: 'opaque', opaqueType: 'pMap', value: PMap }
    | { type: 'opaque', opaqueType: 'outline', value: Outline }
    | { type: 'opaque', opaqueType: 'unit', value: { unit: string } }
    | { type: 'opaque', opaqueType: 'ramp', value: RampT }
    | { type: 'opaque', opaqueType: 'basemap', value: Basemap }
    | { type: 'opaque', opaqueType: 'geoFeatureHandle', value: string }
    | { type: 'opaque', opaqueType: 'geoCentroidHandle', value: string }

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
    allowCustomExpression?: boolean
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

export type USSDefaultValue = { type: 'raw', value: USSRawValue } | { type: 'expression', expr: UrbanStatsASTExpression }

export interface NamedFunctionArgumentWithDocumentation {
    type: USSFunctionArgType
    defaultValue?: USSDefaultValue
    documentation?: NamedFunctionArgumentDocumentation
}

export interface USSFunctionType {
    type: 'function'
    posArgs: USSFunctionArgType[]
    namedArgs: Record<string, NamedFunctionArgumentWithDocumentation>
    returnType: USSFunctionReturnType
}

interface NamedFunctionArgumentDocumentation {
    hide?: boolean
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
    USSOpaqueValue
)

export interface Documentation {
    humanReadableName: string
    priority?: number
    /**
     * True if this is the canonical default value for its type (e.g., the default ramp or scale).
     */
    isDefault?: boolean
    /**
     * Human-readable names for named arguments. Maps argument name to display name.
     */
    namedArgs?: Record<string, string>
    /**
     * Should be included when a constant should be deconstructed into an expression for user editing
     */
    equivalentExpressions?: UrbanStatsASTExpression[]
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

export function rawDefaultValue(value: USSRawValue): USSDefaultValue {
    return { type: 'raw', value }
}

export function expressionDefaultValue(expr: UrbanStatsASTExpression): USSDefaultValue {
    return { type: 'expression', expr }
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
        assert(type.properties instanceof Map, `Expected properties to be a Map, got ${typeof type.properties}`)
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

export function renderDefaultValue(defaultValue: USSDefaultValue): string {
    switch (defaultValue.type) {
        case 'raw':
            return JSON.stringify(defaultValue.value)
        case 'expression':
            return unparse(defaultValue.expr)
    }
}

export function renderKwargType(arg: { type: USSFunctionArgType, defaultValue?: USSDefaultValue }): string {
    const type = renderArgumentType(arg.type)
    if (arg.defaultValue !== undefined) {
        return `${type} = ${renderDefaultValue(arg.defaultValue)}`
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
                return JSON.stringify((value.value as USSOpaqueValue).value)
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

export function canUnifyTo(a: USSType, b: USSType): boolean {
    // returns true iff a can be used in a context where b is expected
    if (renderType(a) === renderType(b)) {
        return true
    }
    // at this point, the types are different
    switch (b.type) {
        case 'number':
        case 'string':
        case 'boolean':
        case 'null':
        case 'opaque':
            // these are all primitive types, so no way to substitute them
            return false
        case 'vector':
            assert(b.elementType.type !== 'elementOfEmptyVector', `Unreachable`)
            return canUnifyTo(a, b.elementType)
        case 'object':
            if (a.type !== 'object') {
                return false
            }
            if (a.properties.size !== b.properties.size) {
                return false
            }
            if (![...a.properties.keys()].every(key => b.properties.has(key))) {
                return false
            }
            return [...a.properties.keys()].every(key => canUnifyTo(a.properties.get(key)!, b.properties.get(key)!))
        case 'function':
            return false
    }
}
