/* c8 ignore start */

import assert from 'assert'

import { UrbanStatsASTStatement, UrbanStatsASTExpression } from '../src/urban-stats-script/ast'
import { defaultConstants } from '../src/urban-stats-script/constants/constants'
import { Context } from '../src/urban-stats-script/context'
import { Effect, InterpretationError } from '../src/urban-stats-script/interpreter'
import { LocInfo } from '../src/urban-stats-script/lexer'
import { parse, toSExp, unparse } from '../src/urban-stats-script/parser'
import { USSRawValue, USSType, USSValue, constantDefaultValue, OriginalFunctionArgs } from '../src/urban-stats-script/types-values'

export const numType = { type: 'number' } satisfies USSType
export const boolType = { type: 'boolean' } satisfies USSType
export const stringType = { type: 'string' } satisfies USSType
export const numVectorType = { type: 'vector', elementType: numType } satisfies USSType
export const numMatrixType = { type: 'vector', elementType: numVectorType } satisfies USSType
export const multiObjType = {
    type: 'object',
    properties: new Map<string, USSType>([
        ['a', numType],
        ['b', numVectorType],
    ]),
} satisfies USSType
export const multiObjVectorType = {
    type: 'vector',
    elementType: multiObjType,
} satisfies USSType

export const testFnType = {
    type: 'function',
    posArgs: [{ type: 'concrete', value: numType }], namedArgs: { a: { type: { type: 'concrete', value: numType } } }, returnType: { type: 'concrete', value: numType } } satisfies USSType

export const testFn1: USSRawValue = (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => (posArgs[0] as number) * (posArgs[0] as number) + (namedArgs.a as number)
export const testFn2: USSRawValue = (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => (posArgs[0] as number) * (posArgs[0] as number) * (posArgs[0] as number) + (namedArgs.a as number)

export const testFnTypeWithDefault = {
    type: 'function',
    posArgs: [{ type: 'concrete', value: numType }],
    namedArgs: { a: { type: { type: 'concrete', value: numType } }, b: { type: { type: 'concrete', value: numType }, defaultValue: constantDefaultValue(1) } },
    returnType: { type: 'concrete', value: numType },
} satisfies USSType

export const testFnWithDefault: USSRawValue = (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue =>
    (posArgs[0] as number) * (posArgs[0] as number) * (posArgs[0] as number) + (namedArgs.a as number) + 10 * (namedArgs.b as number)

export const testObjType = {
    type: 'object',
    properties: new Map<string, USSType>([
        ['u', numType],
        ['v', numType],
    ]),
} satisfies USSType

export const multiArgFnType = {
    type: 'function',
    posArgs: [{ type: 'concrete', value: numType }, { type: 'concrete', value: numVectorType }],
    namedArgs: { a: { type: { type: 'concrete', value: numType } }, b: { type: { type: 'concrete', value: testObjType } } },
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
    return new Context(
        (eff: Effect) => effectsOut.push(eff),
        (msg: string, location: LocInfo) => {
            const error = new InterpretationError(msg, location)
            errorsOut.push({ msg, location })
            return error
        },
        defaultConstants,
        env,
    )
}

export function emptyContext(effects: Effect[] | undefined = undefined): Context {
    return new Context(
        (eff) => {
            if (effects !== undefined) {
                effects.push(eff)
            }
        },
        (msg: string, location: LocInfo) => {
            return new InterpretationError(msg, location)
        },
        defaultConstants,
        new Map<string, USSValue>(),
    )
}

export function emptyContextWithInsets(effects: Effect[] | undefined = undefined): Context {
    const insetContinentalUSA = defaultConstants.get('insetContinentalUSA')
    const insetHawaii = defaultConstants.get('insetHawaii')
    const insetAlaska = defaultConstants.get('insetAlaska')
    const insetGuam = defaultConstants.get('insetGuam')
    const insetPuertoRicoUSVI = defaultConstants.get('insetPuertoRicoPlusUSVI')
    const constructInsets = defaultConstants.get('constructInsets')

    assert(insetContinentalUSA !== undefined, 'Expected insetContinentalUSA to be defined in defaultConstants')
    assert(insetHawaii !== undefined, 'Expected insetHawaii to be defined in defaultConstants')
    assert(insetAlaska !== undefined, 'Expected insetAlaska to be defined in defaultConstants')
    assert(insetGuam !== undefined, 'Expected insetGuam to be defined in defaultConstants')
    assert(insetPuertoRicoUSVI !== undefined, 'Expected insetPuertoRicoPlusUSVI to be defined in defaultConstants')
    assert(constructInsets !== undefined, 'Expected constructInsets to be defined in defaultConstants')

    // Create a USA insets collection from the individual insets
    const insetArray = [insetContinentalUSA.value, insetHawaii.value, insetAlaska.value, insetGuam.value, insetPuertoRicoUSVI.value]

    // Cast to function type and call
    const constructInsetsFunc = constructInsets.value as (
        ctx: Context,
        posArgs: USSRawValue[],
        namedArgs: Record<string, USSRawValue>,
        originalArgs?: OriginalFunctionArgs
    ) => USSRawValue

    const usaInsets = constructInsetsFunc({} as Context, [insetArray], {})

    // Create a default geo variable with geoFeatureHandle type
    const defaultGeo = [
        { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'A' },
        { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'B' },
        { type: 'opaque' as const, opaqueType: 'geoFeatureHandle' as const, value: 'C' },
    ]

    return new Context(
        (eff) => {
            if (effects !== undefined) {
                effects.push(eff)
            }
        },
        (msg: string, location: LocInfo) => {
            return new InterpretationError(msg, location)
        },
        defaultConstants,
        new Map<string, USSValue>([
            ['defaultInsets', { type: { type: 'opaque', name: 'insets' }, value: usaInsets, documentation: { humanReadableName: 'USA Insets' } }],
            ['geo', { type: { type: 'vector', elementType: { type: 'opaque', name: 'geoFeatureHandle' } }, value: defaultGeo, documentation: { humanReadableName: 'Geography' } }],
        ]),
    )
}

function checkUnparseForInline(parsed: UrbanStatsASTExpression | UrbanStatsASTStatement | { type: 'error' }, inline: boolean): void {
    if (parsed.type === 'error') {
        return
    }
    const unparsed = unparse(parsed, 0, inline)
    const reparsed = parse(unparsed, { type: 'single', ident: 'test' })
    if (reparsed.type === 'error') {
        throw new Error(`Reparsed AST of\n${unparsed}\nis an error: ${JSON.stringify(reparsed)}`)
    }
    assert.deepStrictEqual(toSExp(parsed), toSExp(reparsed), `Unparsed and reparsed rendering do not match:\n\t${toSExp(parsed)}\nUnparsed: ${unparsed}\nReparsed:\n\t${toSExp(reparsed)}`)
}

function checkUnparse(parsed: UrbanStatsASTExpression | UrbanStatsASTStatement | { type: 'error' }): void {
    checkUnparseForInline(parsed, false)
    checkUnparseForInline(parsed, true)
}

export function parseExpr(input: string): UrbanStatsASTExpression {
    const parsed = parse(input, { type: 'single', ident: 'test' })
    checkUnparse(parsed)
    if (parsed.type !== 'expression') {
        throw new Error(`Expected an expression, but got ${JSON.stringify(parsed)}`)
    }
    return parsed.value
}

export function parseProgram(input: string): UrbanStatsASTStatement {
    const parsed = parse(input, { type: 'single', ident: 'test' })
    checkUnparse(parsed)
    if (parsed.type !== 'assignment' && parsed.type !== 'statements' && parsed.type !== 'expression') {
        throw new Error(`Expected an assignment or statements, but got ${JSON.stringify(parsed)}`)
    }
    return parsed
}
/* c8 ignore end */
