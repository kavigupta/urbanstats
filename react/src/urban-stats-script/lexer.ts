import { assert } from '../utils/defensive'

import { expressionOperatorMap } from './operators'

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

export interface BaseLocInfo {
    start: SingleLocation
    end: SingleLocation
}

export interface LocInfo extends BaseLocInfo {
    shifted: BaseLocInfo
}

export function newLocation(loc: BaseLocInfo): LocInfo {
    return {
        ...loc,
        shifted: { start: { ...loc.start }, end: { ...loc.end } },
    }
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

export function parseNumber(input: string): number | undefined {
    if (/^\d*(\.\d+)?([eE][+-]?\d+)?$/i.test(input)) {
        // normal number format
        const value = parseFloat(input)
        if (isNaN(value)) {
            return
        }
        return value
    }
    if (input.endsWith('k')) {
        const component = parseNumber(input.slice(0, -1))
        if (component === undefined) {
            return
        }
        return component * 1000
    }
    if (input.endsWith('m')) {
        const component = parseNumber(input.slice(0, -1))
        if (component === undefined) {
            return
        }
        return component * 1000000
    }
    return
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
                location: newLocation({
                    start: { lineIdx: lineNo, colIdx: idx },
                    end: { lineIdx: lineNo, colIdx: idx + 1 },
                }),
            }
            tokens.push(token)
            idx++
            continue
        }
        if (isDigit(char)) {
            let token
            [idx, token] = lexNumber(input, idx, lineNo)
            if (token !== undefined) {
                tokens.push(token)
                continue
            }
        }
        for (const lexer of [identifierLexer, operatorLexer]) {
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
            location: newLocation({
                start: { lineIdx: lineNo, colIdx: idx },
                end: { lineIdx: lineNo, colIdx: idx + 1 },
            }),
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
            location: newLocation({
                start: { lineIdx: i, colIdx: line.length },
                end: { lineIdx: i, colIdx: line.length },
            }),
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
        location: newLocation({
            start: { lineIdx: lineNo, colIdx: start },
            end: { lineIdx: lineNo, colIdx: idx },
        }),
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
            return [idx, { token: { type: 'error', value: 'Unterminated string' }, location: newLocation({ start: { lineIdx: lineNo, colIdx: start }, end: { lineIdx: lineNo, colIdx: idx } }) }]
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
        return [idx, { token: { type: 'error', value: `Invalid string: ${input.slice(start, idx)}: ${e}` }, location: newLocation({ start: { lineIdx: lineNo, colIdx: start }, end: { lineIdx: lineNo, colIdx: idx } }) }]
    }
    const token: AnnotatedToken = {
        token: { type: 'string', value: result },
        location: newLocation({
            start: { lineIdx: lineNo, colIdx: start },
            end: { lineIdx: lineNo, colIdx: idx },
        }),
    }
    return [idx, token]
}

function lexNumber(input: string, idx: number, lineNo: number): [number, AnnotatedToken | undefined] {
    const numberFormat = /^\d+(\.\d+)?([eE][+-]?\d+|k|m)?/i
    const match = numberFormat.exec(input.slice(idx))
    if (!match) {
        return [idx, undefined]
    }
    const numberStr = match[0]
    const number = parseNumber(numberStr)
    if (number === undefined) {
        return [idx + numberStr.length, { token: { type: 'error', value: `Invalid number format: ${numberStr}` }, location: newLocation({ start: { lineIdx: lineNo, colIdx: idx }, end: { lineIdx: lineNo, colIdx: idx + numberStr.length } }) }]
    }
    const token: AnnotatedToken = {
        token: { type: 'number', value: number },
        location: newLocation({
            start: { lineIdx: lineNo, colIdx: idx },
            end: { lineIdx: lineNo, colIdx: idx + numberStr.length },
        }),
    }
    return [idx + numberStr.length, token]
}
