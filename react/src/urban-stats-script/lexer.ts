import { assert } from '../utils/defensive'

import { Block, LocInfo } from './location'
import { expressionOperatorMap } from './operators'

const nonExpressionOperators = ['=', ',', ';', '.', ':']
const operatorCharacters = '!@$%^&*-+=~`<>/?:|,;.'

const keywords = ['if', 'do', 'else', 'autoUX', 'customNode', 'condition']
export type Keyword = (typeof keywords)[number]

interface NumericToken { type: 'number', value: number }
interface IdentifierToken { type: 'identifier', value: string }
interface KeywordToken { type: 'keyword', value: Keyword }
interface StringToken { type: 'string', value: string }
interface OperatorToken { type: 'operator', value: string }
interface BracketToken { type: 'bracket', value: '(' | ')' | '{' | '}' | '[' | ']' }
interface ErrorToken { type: 'error', value: string }
type NonErrorToken = NumericToken | IdentifierToken | KeywordToken | StringToken | OperatorToken | BracketToken
type Token = NonErrorToken | ErrorToken

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

export function emptyLocation(ident: string): LocInfo {
    return {
        start: { block: { type: 'single', ident }, lineIdx: 0, colIdx: 0, charIdx: 0 },
        end: { block: { type: 'single', ident }, lineIdx: 0, colIdx: 0, charIdx: 0 },
    }
}

export function parseNumber(input: string): number | undefined {
    if (/^-?\d*(\.\d+)?([eE][+-]?\d+)?$/i.test(input)) {
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
    parse: (string: string): Token => { return { type: keywords.includes(string) ? 'keyword' : 'identifier', value: string } },
}

export function allOperators(): string[] {
    const ops = new Set<string>(nonExpressionOperators)
    for (const op of expressionOperatorMap.keys()) {
        ops.add(op)
    }
    // sort operators in descending length order to ensure longest match first
    return Array.from(ops).sort((a, b) => b.length - a.length)
}

function tokenizeOperators(input: string): string[] | undefined {
    const allOps = allOperators()
    // console.log(allOps)
    const tokens: string[] = []
    let idx = 0
    while (idx < input.length) {
        let didMatch = false
        for (const op of allOps) {
            if (input.startsWith(op, idx)) {
                tokens.push(op)
                idx += op.length
                didMatch = true
                break
            }
        }
        if (!didMatch)
            return undefined
    }
    if (idx !== input.length) {
        return undefined
    }
    return tokens
}

function lexOperators(input: string, idx: number, block: Block, lineNo: number, charIdxOffset: number): [number, AnnotatedToken[]] {
    const [finalIdx, supertok] = lexGeneric(input, idx, block, lineNo, operatorLexer, charIdxOffset)
    if (finalIdx === idx) {
        return [idx, []]
    }
    // console.log(supertok)
    assert(supertok !== undefined, 'unreachable')
    assert(supertok.token.type === 'operator', 'unreachable')
    const tokenizedOperators = tokenizeOperators(supertok.token.value)
    // console.log(tokenizedOperators)
    if (tokenizedOperators === undefined) {
        return [finalIdx, [
            {
                token: { type: 'error', value: `Invalid operator sequence: ${supertok.token.value}` },
                location: supertok.location,
            },
        ]]
    }
    let start = idx
    const separatedTokens = tokenizedOperators.map((op) => {
        const location: LocInfo = {
            start: { block, lineIdx: lineNo, colIdx: start, charIdx: charIdxOffset + start },
            end: { block, lineIdx: lineNo, colIdx: start + op.length, charIdx: charIdxOffset + start + op.length },
        }
        start += op.length
        return {
            token: { type: 'operator', value: op },
            location,
        } satisfies AnnotatedToken
    })
    // console.log(separatedTokens)
    return [finalIdx, separatedTokens]
}

const operatorLexer: GenericLexer = {
    firstToken: (ch: string): boolean => operatorCharacters.includes(ch),
    innerToken: (ch: string): boolean => operatorCharacters.includes(ch),
    parse: (string: string): Token => {
        return { type: 'operator', value: string }
    },
}

function lexLine(input: string, block: Block, lineNo: number, charIdxOffset: number): AnnotatedToken[] {
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
                    start: { block, lineIdx: lineNo, colIdx: idx, charIdx: charIdxOffset + idx },
                    end: { block, lineIdx: lineNo, colIdx: idx + 1, charIdx: charIdxOffset + idx + 1 },
                },
            }
            tokens.push(token)
            idx++
            continue
        }
        if (isDigit(char)) {
            let token
            [idx, token] = lexNumber(input, idx, block, lineNo, charIdxOffset)
            if (token !== undefined) {
                tokens.push(token)
                continue
            }
        }
        for (const lexer of [identifierLexer]) {
            let token
            [idx, token] = lexGeneric(input, idx, block, lineNo, lexer, charIdxOffset)
            if (token !== undefined) {
                tokens.push(token)
                continue lex
            }
        }
        {
            let toks
            [idx, toks] = lexOperators(input, idx, block, lineNo, charIdxOffset)
            if (toks.length > 0) {
                tokens.push(...toks)
                continue
            }
        }
        let token
        [idx, token] = lexString(input, idx, block, lineNo, charIdxOffset)
        if (token !== undefined) {
            tokens.push(token)
            continue
        }
        tokens.push({
            token: { type: 'error', value: `Unexpected character: ${char}` },
            location: {
                start: { block, lineIdx: lineNo, colIdx: idx, charIdx: charIdxOffset + idx },
                end: { block, lineIdx: lineNo, colIdx: idx + 1, charIdx: charIdxOffset + idx + 1 },
            },
        })
        idx++
    }
    return tokens
}

export function lex(block: Block, input: string): AnnotatedToken[] {
    const tokens: AnnotatedToken[] = []
    const lines = input.split('\n')
    let charIdx = 0
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineTokens = lexLine(line, block, i, charIdx)
        tokens.push(...lineTokens)
        charIdx += line.length
        tokens.push({
            token: { type: 'operator', value: 'EOL' },
            location: {
                start: { block, lineIdx: i, colIdx: line.length, charIdx },
                end: { block, lineIdx: i, colIdx: line.length, charIdx },
            },
        })
        charIdx += 1 // newline
    }
    return tokens
}

function lexGeneric(
    input: string,
    idx: number,
    block: Block,
    lineNo: number,
    lexer: GenericLexer,
    charIdxOffset: number,
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
            start: { block, lineIdx: lineNo, colIdx: start, charIdx: charIdxOffset + start },
            end: { block, lineIdx: lineNo, colIdx: idx, charIdx: charIdxOffset + idx },
        },
    }
    return [idx, token]
}

function lexString(input: string, idx: number, block: Block, lineNo: number, charIdxOffset: number): [number, AnnotatedToken | undefined] {
    if (input[idx] !== '"') {
        return [idx, undefined]
    }
    const start = idx
    idx++
    while (true) {
        if (idx >= input.length) {
            return [idx, { token: { type: 'error', value: 'Unterminated string' }, location: { start: { block, lineIdx: lineNo, colIdx: start, charIdx: charIdxOffset + start }, end: { block, lineIdx: lineNo, colIdx: idx, charIdx: charIdxOffset + start } } }]
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
        return [idx, { token: { type: 'error', value: `Invalid string: ${input.slice(start, idx)}: ${e}` }, location: { start: { block, lineIdx: lineNo, colIdx: start, charIdx: charIdxOffset + start }, end: { block, lineIdx: lineNo, colIdx: idx, charIdx: charIdxOffset + idx } } }]
    }
    const token: AnnotatedToken = {
        token: { type: 'string', value: result },
        location: {
            start: { block, lineIdx: lineNo, colIdx: start, charIdx: charIdxOffset + start },
            end: { block, lineIdx: lineNo, colIdx: idx, charIdx: charIdxOffset + idx },
        },
    }
    return [idx, token]
}

function lexNumber(input: string, idx: number, block: Block, lineNo: number, charIdxOffset: number): [number, AnnotatedToken | undefined] {
    const numberFormat = /^\d+(\.\d+)?([eE][+-]?\d+|k|m)?/i
    const match = numberFormat.exec(input.slice(idx))
    if (!match) {
        return [idx, undefined]
    }
    const numberStr = match[0]
    const number = parseNumber(numberStr)
    if (number === undefined) {
        return [idx + numberStr.length, { token: { type: 'error', value: `Invalid number format: ${numberStr}` }, location: { start: { block, lineIdx: lineNo, colIdx: idx, charIdx: charIdxOffset + idx }, end: { block, lineIdx: lineNo, colIdx: idx + numberStr.length, charIdx: charIdxOffset + idx + numberStr.length } } }]
    }
    const token: AnnotatedToken = {
        token: { type: 'number', value: number },
        location: {
            start: { block, lineIdx: lineNo, colIdx: idx, charIdx: charIdxOffset + idx },
            end: { block, lineIdx: lineNo, colIdx: idx + numberStr.length, charIdx: charIdxOffset + idx + numberStr.length },
        },
    }
    return [idx + numberStr.length, token]
}
