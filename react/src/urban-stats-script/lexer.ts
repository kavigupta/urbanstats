export const infixOperators = [
    '+', '-', '*', '**', '/', '==', '!=', '<', '>', '<=', '>=', '&', '|',
]
const operators = [...infixOperators, '=', ',', ';', '.']
const operatorCharacters = '!@$%^&*-+=~`<>/?:|,;.'

interface NumericToken { type: 'number', value: number }
interface IdentifierToken { type: 'identifier', value: string }
interface StringToken { type: 'string', value: string }
interface OperatorToken { type: 'operator', value: string }
interface BracketToken { type: 'bracket', value: string }
interface ErrorToken { type: 'error', value: string }
type Token = NumericToken | IdentifierToken | StringToken | OperatorToken | BracketToken | ErrorToken

export interface LocInfo {
    lineIdx: number
    startIdx: number
    endIdx: number
}

export interface AnnotatedToken {
    token: Token
    location: LocInfo
}

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
        if (isNaN(value)) {
            return { type: 'error', value: `Invalid number: ${string}` }
        }
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
    if (input.includes('\n')) {
        throw new Error('Input contains new line characters')
    }
    let idx = 0
    while (idx < input.length) {
        const char = input[idx]
        if (char === ' ') {
            idx++
            continue
        }
        if ('()[]{}'.includes(char)) {
            const token: AnnotatedToken = {
                token: { type: 'bracket', value: char },
                location: {
                    lineIdx: lineNo,
                    startIdx: idx,
                    endIdx: idx + 1,
                },
            }
            tokens.push(token)
            idx++
            continue
        }
        let done = false
        for (const lexer of [numberLexer, identifierLexer, operatorLexer]) {
            let token
            [idx, token] = lexGeneric(input, idx, lineNo, lexer)
            if (token !== undefined) {
                tokens.push(token)
                done = true
                break
            }
        }
        if (done) {
            continue
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
                lineIdx: lineNo,
                startIdx: idx,
                endIdx: idx + 1,
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
                lineIdx: i,
                startIdx: line.length,
                endIdx: line.length,
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
            lineIdx: lineNo,
            startIdx: start,
            endIdx: idx,
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
            return [idx, { token: { type: 'error', value: 'Unterminated string' }, lineIdx: lineNo, startIdx: start, endIdx: idx }]
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
        const resultObj: object = JSON.parse(input.slice(start, idx)) as object
        if (typeof resultObj !== 'string') {
            throw new Error(`Invalid string: ${input.slice(start, idx)}`)
        }
        result = resultObj as string
    }
    catch {
        return [idx, { token: { type: 'error', value: `Invalid string: ${input.slice(start, idx)}` }, lineIdx: lineNo, startIdx: start, endIdx: idx }]
    }
    const token: AnnotatedToken = {
        token: { type: 'string', value: result },
        location: {
            lineIdx: lineNo,
            startIdx: start,
            endIdx: idx,
        },
    }
    return [idx, token]
}
