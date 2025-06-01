import { Context, Effect, InterpretationError } from '../src/urban-stats-script/interpreter'
import { lex, LocInfo } from '../src/urban-stats-script/lexer'
import { parse, UrbanStatsASTExpression } from '../src/urban-stats-script/parser'
import { USSRawValue, USSType, USSValue } from '../src/urban-stats-script/types-values'

export const numType = { type: 'number' } satisfies USSType
export const boolType = { type: 'boolean' } satisfies USSType
export const stringType = { type: 'string' } satisfies USSType
export const numVectorType = { type: 'vector', elementType: numType } satisfies USSType
export const numMatrixType = { type: 'vector', elementType: numVectorType } satisfies USSType
export const multiObjType = { type: 'object', properties: { a: numType, b: numVectorType } } satisfies USSType
export const multiObjVectorType = {
    type: 'vector',
    elementType: multiObjType,
} satisfies USSType

export const testFnType = { type: 'function', posArgs: [{ type: 'concrete', value: numType }], namedArgs: { a: { type: 'concrete', value: numType } }, returnType: { type: 'concrete', value: numType } } satisfies USSType

export const testFn1: USSRawValue = (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => (posArgs[0] as number) * (posArgs[0] as number) + (namedArgs.a as number)
export const testFn2: USSRawValue = (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => (posArgs[0] as number) * (posArgs[0] as number) * (posArgs[0] as number) + (namedArgs.a as number)

export const testObjType = {
    type: 'object',
    properties: {
        u: numType,
        v: numType,
    },
} satisfies USSType

export const multiArgFnType = {
    type: 'function',
    posArgs: [{ type: 'concrete', value: numType }, { type: 'concrete', value: numVectorType }],
    namedArgs: { a: { type: 'concrete', value: numType }, b: { type: 'concrete', value: testObjType } },
    returnType: { type: 'concrete', value: numVectorType },
} satisfies USSType

export function testFnMultiArg(ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue {
    const x = posArgs[0] as number
    const y = posArgs[1] as number[]
    const a = namedArgs.a as number
    const b = namedArgs.b as Map<string, USSRawValue>
    return [
        x,
        y.reduce((acc, val) => acc + val, 0),
        y.reduce((acc, val) => acc + val * val, 0),
        a,
        b.get('u') as number,
        b.get('v') as number,
    ]
}

export function testingContext(effectsOut: Effect[], errorsOut: { msg: string, location: LocInfo }[], env: Map<string, USSValue>): Context {
    return {
        effect: (eff: Effect): void => {
            effectsOut.push(eff)
        },
        error: (msg: string, location: LocInfo): InterpretationError => {
            errorsOut.push({ msg, location })
            return new InterpretationError(msg, location)
        },
        variables: env,
    }
}

export function parseExpr(input: string): UrbanStatsASTExpression {
    const parsed = parse(input)
    if (parsed.type !== 'expression') {
        throw new Error(`Expected an expression, but got ${JSON.stringify(parsed)}`)
    }
    return parsed.value
}
