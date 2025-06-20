import { Context } from './context'
import { USSRawValue } from './types-values'

type USSFunctionValue = (
    ctx: Context,
    posArgs: USSRawValue[],
    namedArgs: Record<string, USSRawValue>,
) => USSRawValue

const functions = new Map<string, USSFunctionValue>()

export function defineFunction(identifier: string, fn: USSFunctionValue): { type: 'function', identifier: string } {
    functions.set(identifier, fn)
    return { type: 'function', identifier }
}

export function getFunction(identifier: string): USSFunctionValue {
    if (!functions.has(identifier)) {
        throw new Error(`no function with identifier ${identifier}`)
    }
    return functions.get(identifier)!
}
