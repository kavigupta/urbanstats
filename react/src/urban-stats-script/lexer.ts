import { assert } from '../utils/defensive'

import { Context } from './context'
import { getPrimitiveType, USSPrimitiveRawValue, USSRawValue, USSValue } from './types-values'

interface Operator {
    precedence: number
    unary?: (op: string, locInfo: LocInfo) => USSValue
    binary?: (op: string, locInfo: LocInfo) => USSValue
}

interface UnaryOperation {
    type: string
    fn: (x: USSPrimitiveRawValue) => USSPrimitiveRawValue
}

interface BinaryOperation {
    leftType: string
    rightType: string
    fn: (x: USSPrimitiveRawValue, y: USSPrimitiveRawValue) => USSPrimitiveRawValue
}

function unaryOperator(unos: UnaryOperation[]): (op: string, locInfo: LocInfo) => USSValue {
    return (op, locInfo) => {
        return {
            type: { type: 'function', posArgs: [{ type: 'anyPrimitive' }], namedArgs: {}, returnType: { type: 'inferFromPrimitive' } },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for type signature
            value: (ctx: Context, posArgs: USSRawValue[], _namedArgs: Record<string, USSRawValue>): USSRawValue => {
                const argType = getPrimitiveType(posArgs[0]).type
                for (const uno of unos) {
                    if (uno.type === argType) {
                        return uno.fn(posArgs[0] as USSPrimitiveRawValue)
                    }
                }
                throw ctx.error(`Invalid type for operator ${op}: ${argType}`, locInfo)
            },
        }
    }
}

function binaryOperator(bos: BinaryOperation[]): (op: string, locInfo: LocInfo) => USSValue {
    return (op, locInfo) => {
        return {
            type: { type: 'function', posArgs: [{ type: 'anyPrimitive' }, { type: 'anyPrimitive' }], namedArgs: {}, returnType: { type: 'inferFromPrimitive' } },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for type signature
            value: (ctx: Context, posArgs: USSRawValue[], _namedArgs: Record<string, USSRawValue>): USSRawValue => {
                const leftType = getPrimitiveType(posArgs[0]).type
                const rightType = getPrimitiveType(posArgs[1]).type
                for (const bo of bos) {
                    if (bo.leftType === leftType && bo.rightType === rightType) {
                        return bo.fn(posArgs[0] as USSPrimitiveRawValue, posArgs[1] as USSPrimitiveRawValue)
                    }
                }
                throw ctx.error(`Invalid types for operator ${op}: ${leftType} and ${rightType}`, locInfo)
            },
        }
    }
}

function numericBinaryOperation(fn: (a: number, b: number) => number): BinaryOperation {
    return {
        leftType: 'number',
        rightType: 'number',
        fn: (a, b) => fn(a as number, b as number),
    }
}

function comparisonOperation(
    fnNumber: (a: number, b: number) => boolean,
    fnString: (a: string, b: string) => boolean,
    fnBoolean: ((a: boolean, b: boolean) => boolean) | undefined = undefined,
    fnNull: ((a: null, b: null) => boolean) | undefined = undefined,
): BinaryOperation[] {
    const bos = [
        {
            leftType: 'number',
            rightType: 'number',
            fn: (a, b) => fnNumber(a as number, b as number),
        },
        {
            leftType: 'string',
            rightType: 'string',
            fn: (a, b) => fnString(a as string, b as string),
        },
    ] satisfies BinaryOperation[]
    if (fnBoolean !== undefined) {
        bos.push({
            leftType: 'boolean',
            rightType: 'boolean',
            fn: (a, b) => fnBoolean(a as boolean, b as boolean),
        })
    }
    if (fnNull !== undefined) {
        bos.push({
            leftType: 'null',
            rightType: 'null',
            fn: (a, b) => fnNull(a as null, b as null),
        })
    }
    return bos
}

function booleanOperation(fn: (a: boolean, b: boolean) => boolean): BinaryOperation {
    return {
        leftType: 'boolean',
        rightType: 'boolean',
        fn: (a, b) => fn(a as boolean, b as boolean),
    }
}

export const expressionOperatorMap = new Map<string, Operator>([
    // E
    ['**', { precedence: 1000, binary: binaryOperator([numericBinaryOperation((a, b) => Math.pow(a, b))]) }],
    // MD
    ['*', { precedence: 900, binary: binaryOperator([numericBinaryOperation((a, b) => a * b)]) }],
    ['/', { precedence: 900, binary: binaryOperator([numericBinaryOperation((a, b) => a / b)]) }],
    // AS
    ['+', { precedence: 800,
        unary: unaryOperator([{ type: 'number', fn: x => x }]),
        binary: binaryOperator([
            numericBinaryOperation((a, b) => a + b),
            { leftType: 'string', rightType: 'string', fn: (a, b) => (a as string) + (b as string) },
        ]),
    }],
    ['-', { precedence: 800,
        unary: unaryOperator([{ type: 'number', fn: x => -(x as number) }]),
        binary: binaryOperator([numericBinaryOperation((a, b) => a - b)]),
    }],
    // Comparators
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- for consistency
    ['==', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a === b, (a, b) => a === b, (a, b) => a === b, (a, b) => a === b)) }],
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- for consistency
    ['!=', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a !== b, (a, b) => a !== b, (a, b) => a !== b, (a, b) => a !== b)) }],
    ['<', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a < b, (a, b) => a < b)) }],
    ['>', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a > b, (a, b) => a > b)) }],
    ['<=', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a <= b, (a, b) => a <= b)) }],
    ['>=', { precedence: 700, binary: binaryOperator(comparisonOperation((a, b) => a >= b, (a, b) => a >= b)) }],
    // Logic
    ['!', { precedence: 650, unary: unaryOperator([{ type: 'boolean', fn: x => !(x as boolean) }]) }],
    ['&', { precedence: 600, binary: binaryOperator([booleanOperation((a, b) => a && b)]) }],
    ['|', { precedence: 500, binary: binaryOperator([booleanOperation((a, b) => a || b)]) }],
])

export const unaryOperators = [...expressionOperatorMap.entries()].filter(([, op]) => op.unary !== undefined).map(([op]) => op)
export const infixOperators = [...expressionOperatorMap.entries()].filter(([, op]) => op.binary !== undefined).map(([op]) => op)
const operators = [...expressionOperatorMap.keys(), '=', ',', ';', '.', ':']
const operatorCharacters = '!@$%^&*-+=~`<>/?:|,;.'

interface NumericToken { type: 'number', value: number }
interface IdentifierToken { type: 'identifier', value: string }
interface StringToken { type: 'string', value: string }
interface OperatorToken { type: 'operator', value: string }
interface BracketToken { type: 'bracket', value: '(' | ')' | '{' | '}' | '[' | ']' }
interface ErrorToken { type: 'error', value: string }
type NonErrorToken = NumericToken | IdentifierToken | StringToken | OperatorToken | BracketToken
type Token = NonErrorToken | ErrorToken

interface SingleLocation {
    lineIdx: number
    colIdx: number
}

export interface LocInfo {
    start: SingleLocation
    end: SingleLocation
}

export interface AnnotatedToken {
    token: Token
    location: LocInfo
}

export type AnnotatedTokenWithValue = AnnotatedToken & { token: NonErrorToken }

interface GenericLexer {
    firstToken: (ch: string) => boolean
    innerToken: (ch: string) => boolean
    parse: (string: string) => Token
}

function isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9'
}
function isAlpha(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_'
}

const numberLexer: GenericLexer = {
    firstToken: isDigit,
    innerToken: (ch: string): boolean => isDigit(ch) || ch === '.',
    parse: (string: string): Token => {
        const value = parseFloat(string)
        assert(!isNaN(value), `Invalid number: ${string}`)
        return { type: 'number', value }
    },
}

const identifierLexer: GenericLexer = {
    firstToken: isAlpha,
    innerToken: (ch: string): boolean => isAlpha(ch) || isDigit(ch),
    parse: (string: string): Token => { return { type: 'identifier', value: string } },
}

const operatorLexer: GenericLexer = {
    firstToken: (ch: string): boolean => operatorCharacters.includes(ch),
    innerToken: (ch: string): boolean => operatorCharacters.includes(ch),
    parse: (string: string): Token => {
        if (operators.includes(string)) {
            return { type: 'operator', value: string }
        }
        return { type: 'error', value: `Invalid operator: ${string}` }
    },
}

function lexLine(input: string, lineNo: number): AnnotatedToken[] {
    const tokens: AnnotatedToken[] = []
    // one line
    assert(!input.includes('\n'), 'Input contains new line characters')
    let idx = 0
    lex: while (idx < input.length) {
        const char = input[idx]
        if (char === ' ') {
            idx++
            continue
        }
        if (char === '(' || char === ')' || char === '{' || char === '}' || char === '[' || char === ']') {
            const token: AnnotatedToken = {
                token: { type: 'bracket', value: char },
                location: {
                    start: { lineIdx: lineNo, colIdx: idx },
                    end: { lineIdx: lineNo, colIdx: idx + 1 },
                },
            }
            tokens.push(token)
            idx++
            continue
        }
        for (const lexer of [numberLexer, identifierLexer, operatorLexer]) {
            let token
            [idx, token] = lexGeneric(input, idx, lineNo, lexer)
            if (token !== undefined) {
                tokens.push(token)
                continue lex
            }
        }
        let token
        [idx, token] = lexString(input, idx, lineNo)
        if (token !== undefined) {
            tokens.push(token)
            continue
        }
        tokens.push({
            token: { type: 'error', value: `Unexpected character: ${char}` },
            location: {
                start: { lineIdx: lineNo, colIdx: idx },
                end: { lineIdx: lineNo, colIdx: idx + 1 },
            },
        })
        idx++
    }
    return tokens
}

export function lex(input: string): AnnotatedToken[] {
    const tokens: AnnotatedToken[] = []
    const lines = input.split('\n')
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineTokens = lexLine(line, i)
        tokens.push(...lineTokens)
        tokens.push({
            token: { type: 'operator', value: 'EOL' },
            location: {
                start: { lineIdx: i, colIdx: line.length },
                end: { lineIdx: i, colIdx: line.length },
            },
        })
    }
    return tokens
}

function lexGeneric(
    input: string,
    idx: number,
    lineNo: number,
    lexer: GenericLexer,
): [number, AnnotatedToken | undefined] {
    if (!lexer.firstToken(input[idx])) {
        return [idx, undefined]
    }

    const start = idx
    while (idx < input.length && lexer.innerToken(input[idx])) {
        idx++
    }
    const token: AnnotatedToken = {
        token: lexer.parse(input.slice(start, idx)),
        location: {
            start: { lineIdx: lineNo, colIdx: start },
            end: { lineIdx: lineNo, colIdx: idx },
        },
    }
    return [idx, token]
}

function lexString(input: string, idx: number, lineNo: number): [number, AnnotatedToken | undefined] {
    if (input[idx] !== '"') {
        return [idx, undefined]
    }
    const start = idx
    idx++
    while (true) {
        if (idx >= input.length) {
            return [idx, { token: { type: 'error', value: 'Unterminated string' }, location: { start: { lineIdx: lineNo, colIdx: start }, end: { lineIdx: lineNo, colIdx: idx } } }]
        }
        if (input[idx] === '"') {
            idx++
            break
        }
        if (input[idx] === '\\') {
            idx += 2
            continue
        }
        idx++
    }
    let result: string
    try {
        const resultObj: unknown = JSON.parse(input.slice(start, idx))
        assert(typeof resultObj === 'string', `Invalid string: ${input.slice(start, idx)}`)
        result = resultObj
    }
    catch (e) {
        return [idx, { token: { type: 'error', value: `Invalid string: ${input.slice(start, idx)}: ${e}` }, location: { start: { lineIdx: lineNo, colIdx: start }, end: { lineIdx: lineNo, colIdx: idx } } }]
    }
    const token: AnnotatedToken = {
        token: { type: 'string', value: result },
        location: {
            start: { lineIdx: lineNo, colIdx: start },
            end: { lineIdx: lineNo, colIdx: idx },
        },
    }
    return [idx, token]
}
