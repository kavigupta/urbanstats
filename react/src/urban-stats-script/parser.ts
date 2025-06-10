import { assert } from '../utils/defensive'

import { AnnotatedToken, AnnotatedTokenWithValue, BaseLocInfo, lex, LocInfo, newLocation } from './lexer'
import { expressionOperatorMap, infixOperators, unaryOperators } from './operators'

interface Decorated<T> {
    node: T
    location: LocInfo
}

export type UrbanStatsASTArg = (
    { type: 'unnamed', value: UrbanStatsASTExpression }
    | { type: 'named', name: Decorated<string>, value: UrbanStatsASTExpression }
)

export type UrbanStatsASTLHS = (
    { type: 'identifier', name: Decorated<string> }
    | { type: 'attribute', expr: UrbanStatsASTExpression, name: Decorated<string> }

)

export type UrbanStatsASTExpression = (
    UrbanStatsASTLHS
    | { type: 'constant', value: Decorated<number | string> }
    | { type: 'function', fn: UrbanStatsASTExpression, args: UrbanStatsASTArg[], entireLoc: LocInfo }
    | { type: 'binaryOperator', operator: Decorated<string>, left: UrbanStatsASTExpression, right: UrbanStatsASTExpression }
    | { type: 'unaryOperator', operator: Decorated<string>, expr: UrbanStatsASTExpression }
    | { type: 'objectLiteral', entireLoc: LocInfo, properties: [string, UrbanStatsASTExpression][] }
    | { type: 'vectorLiteral', entireLoc: LocInfo, elements: UrbanStatsASTExpression[] }
    | { type: 'if', entireLoc: LocInfo, condition: UrbanStatsASTExpression, then: UrbanStatsASTStatement, else?: UrbanStatsASTStatement }
)

export type UrbanStatsASTStatement = (
    { type: 'assignment', lhs: UrbanStatsASTLHS, value: UrbanStatsASTExpression }
    | { type: 'expression', value: UrbanStatsASTExpression }
    | { type: 'statements', entireLoc: LocInfo, result: UrbanStatsASTStatement[] }
)

type UrbanStatsAST = UrbanStatsASTArg | UrbanStatsASTExpression | UrbanStatsASTStatement
export interface ParseError { type: 'error', value: string, location: LocInfo }

type USSInfixSequenceElement = { type: 'operator', operatorType: 'unary' | 'binary', value: Decorated<string> } | UrbanStatsASTExpression

function unifyBase(...locations: BaseLocInfo[]): BaseLocInfo {
    assert(locations.length > 0, 'At least one location must be provided for unification')
    const startLine = locations.reduce((min, loc) => Math.min(min, loc.start.lineIdx), Number.MAX_VALUE)
    const endLine = locations.reduce((max, loc) => Math.max(max, loc.end.lineIdx), -Number.MAX_VALUE)
    const startCol = locations.reduce((min, loc) => Math.min(min, loc.start.colIdx), Number.MAX_VALUE)
    const endCol = locations.reduce((max, loc) => Math.max(max, loc.end.colIdx), -Number.MAX_VALUE)
    return {
        start: { lineIdx: startLine, colIdx: startCol },
        end: { lineIdx: endLine, colIdx: endCol },
    }
}

function unify(...locations: LocInfo[]): LocInfo {
    return {
        ...unifyBase(...locations),
        shifted: unifyBase(...locations.map(l => l.shifted)),
    }
}

export function locationOf(node: UrbanStatsAST): LocInfo {
    /* c8 ignore start -- This function doesn't need to be tested in detail, as it is a simple location extractor */
    switch (node.type) {
        case 'unnamed':
            return locationOf(node.value)
        case 'named':
            return unify(node.name.location, locationOf(node.value))
        case 'constant':
            return node.value.location
        case 'identifier':
            return node.name.location
        case 'attribute':
            return unify(node.name.location, locationOf(node.expr))
        case 'function':
            return node.entireLoc
        case 'unaryOperator':
            return unify(node.operator.location, locationOf(node.expr))
        case 'binaryOperator':
            return unify(locationOf(node.left), locationOf(node.right), node.operator.location)
        case 'objectLiteral':
            return node.entireLoc
        case 'vectorLiteral':
            return node.entireLoc
        case 'assignment':
            return unify(locationOf(node.lhs), locationOf(node.value))
        case 'expression':
            return locationOf(node.value)
        case 'statements':
            return node.entireLoc
        case 'if':
            return node.entireLoc
    }
    /* c8 ignore stop */
}

export function toSExp(node: UrbanStatsAST): string {
    /**
     * For testing purposes, we convert the AST to a simple S-expression format.
     */
    switch (node.type) {
        case 'unnamed':
            return toSExp(node.value)
        case 'named':
            return `(named ${node.name.node} ${toSExp(node.value)})`
        case 'constant':
            return `(const ${node.value.node})`
        case 'identifier':
            return `(id ${node.name.node})`
        case 'attribute':
            return `(attr ${toSExp(node.expr)} ${node.name.node})`
        case 'function':
            return `(fn ${[node.fn, ...node.args].map(toSExp).join(' ')})`
        case 'unaryOperator':
            return `(${node.operator.node} ${toSExp(node.expr)})`
        case 'binaryOperator':
            return `(${node.operator.node} ${toSExp(node.left)} ${toSExp(node.right)})`
        case 'vectorLiteral':
            return `(vector ${node.elements.map(toSExp).join(' ')})`
        case 'objectLiteral':
            return `(object ${node.properties.map(([key, value]) => `(${key} ${toSExp(value)})`).join(' ')})`
        case 'assignment':
            return `(assign ${toSExp(node.lhs)} ${toSExp(node.value)})`
        case 'expression':
            return `(expr ${toSExp(node.value)})`
        case 'statements':
            return `(statements ${node.result.map(toSExp).join(' ')})`
        case 'if':
            return `(if ${toSExp(node.condition)} ${toSExp(node.then)}${node.else ? ` ${toSExp(node.else)}` : ''})`
    }
}

class ParseState {
    tokens: AnnotatedTokenWithValue[]
    index: number
    constructor(tokens: AnnotatedTokenWithValue[]) {
        this.tokens = tokens
        this.index = 0
    }

    skipEOL(): boolean {
        if (this.index >= this.tokens.length) {
            return false
        }
        const token = this.tokens[this.index]
        if (token.token.type === 'operator' && token.token.value === 'EOL') {
            this.index++
            return true
        }
        return false
    }

    consumeTokenOfType(type: string, ...values: (string | number)[]): boolean {
        if (this.index >= this.tokens.length) {
            return false
        }
        const token = this.tokens[this.index]
        if (token.token.type === type && (values.length === 0 || values.includes(token.token.value))) {
            this.index++
            return true
        }
        if (this.skipEOL()) {
            if (this.consumeTokenOfType(type, ...values)) {
                return true
            }
            this.index-- // backtrack
        }
        return false
    }

    consumeOperator(...oneOfOps: string[]): boolean {
        return this.consumeTokenOfType('operator', ...oneOfOps)
    }

    consumeBracket(...oneOfBrackets: string[]): boolean {
        return this.consumeTokenOfType('bracket', ...oneOfBrackets)
    }

    consumeIdentifier(...oneOfIdentifiers: string[]): boolean {
        return this.consumeTokenOfType('identifier', ...oneOfIdentifiers)
    }

    maybeLastNonEOLToken(): AnnotatedTokenWithValue {
        for (let i = this.index - 1; i >= 0; i--) {
            const token = this.tokens[i]
            if (token.token.type !== 'operator' || token.token.value !== 'EOL') {
                return token
            }
        }
        return this.tokens[this.index - 1]
    }

    parseSingleExpression(): UrbanStatsASTExpression | ParseError {
        while (this.skipEOL()) { }
        if (this.index >= this.tokens.length) {
            return { type: 'error', value: 'Unexpected end of input', location: this.maybeLastNonEOLToken().location }
        }
        const token = this.tokens[this.index]
        switch (token.token.type) {
            case 'number':
            case 'string':
                this.index++
                return { type: 'constant', value: { node: token.token.value, location: token.location } }
            case 'identifier':
                this.index++
                return { type: 'identifier', name: { node: token.token.value, location: token.location } }
            case 'bracket':
                switch (token.token.value) {
                    case '(':
                        this.index++
                        const expr = this.parseExpression()
                        if (expr.type === 'error') {
                            return expr
                        }
                        if (!this.consumeBracket(')')) {
                            return { type: 'error', value: 'Expected closing bracket ) to match this one', location: token.location }
                        }
                        return expr
                    case '{':
                        this.index++
                        const startLoc = token.location
                        const properties: [string, UrbanStatsASTExpression][] = []
                        while (!this.consumeBracket('}')) {
                            if (properties.length > 0 && !this.consumeOperator(',')) {
                                return { type: 'error', value: `Expected comma , or closing bracket } after object field name; instead received ${this.tokens[this.index].token.value}`, location: this.tokens[this.index].location }
                            }
                            if (!this.consumeIdentifier()) {
                                return { type: 'error', value: 'Expected identifier for object field name', location: this.maybeLastNonEOLToken().location }
                            }
                            const keyToken = this.tokens[this.index - 1]
                            assert(keyToken.token.type === 'identifier', `Expected identifier token, but got ${keyToken.token.type}`)
                            if (!this.consumeOperator(':')) {
                                return { type: 'error', value: `Expected : token after object field name`, location: keyToken.location }
                            }
                            const value = this.parseExpression()
                            if (value.type === 'error') {
                                return value
                            }
                            properties.push([keyToken.token.value, value])
                        }
                        const endLoc = this.tokens[this.index - 1].location
                        return {
                            type: 'objectLiteral',
                            entireLoc: unify(startLoc, endLoc),
                            properties,
                        }
                    case '[':
                        this.index++
                        const vectorStartLoc = token.location
                        const elements: UrbanStatsASTExpression[] = []
                        while (!this.consumeBracket(']')) {
                            if (elements.length > 0 && !this.consumeOperator(',')) {
                                return { type: 'error', value: 'Expected comma , or closing bracket ] after vector element', location: this.tokens[this.index].location }
                            }
                            const element = this.parseExpression()
                            if (element.type === 'error') {
                                return element
                            }
                            elements.push(element)
                        }
                        const vectorEndLoc = this.tokens[this.index - 1].location
                        return {
                            type: 'vectorLiteral',
                            entireLoc: unify(vectorStartLoc, vectorEndLoc),
                            elements,
                        }
                }
                return { type: 'error', value: `Unexpected bracket ${token.token.value}`, location: token.location }
            case 'operator':
                return { type: 'error', value: `Unexpected operator ${token.token.value}`, location: token.location }
        }
    }

    parseArg(): UrbanStatsASTArg | ParseError {
        const exprOrName = this.parseExpression()
        if (exprOrName.type === 'error') {
            return exprOrName
        }
        if (!this.consumeOperator('=')) {
            return { type: 'unnamed', value: exprOrName }
        }
        const expr = this.parseExpression()
        if (expr.type === 'error') {
            return expr
        }
        if (exprOrName.type !== 'identifier') {
            return { type: 'error', value: 'Expected identifier for named argument', location: locationOf(exprOrName) }
        }
        return {
            type: 'named',
            name: { node: exprOrName.name.node, location: exprOrName.name.location },
            value: expr,
        }
    }

    parseParenthesizedArgs(): { type: 'args', args: [UrbanStatsASTArg[], LocInfo] } | ParseError | undefined {
        if (!this.consumeBracket('(')) {
            return undefined
        }
        const startLoc = this.tokens[this.index - 1].location
        const args: UrbanStatsASTArg[] = []
        while (true) {
            if (this.consumeBracket(')')) {
                const endLoc = this.tokens[this.index - 1].location
                return { type: 'args', args: [args, unify(startLoc, endLoc)] }
            }
            if (args.length > 0 && !this.consumeOperator(',')) {
                return { type: 'error', value: `Expected comma , or closing bracket ); instead received ${this.tokens[this.index].token.value}`, location: this.tokens[this.index].location }
            }
            const arg = this.parseArg()
            if (arg.type === 'error') {
                return arg
            }
            args.push(arg)
        }
    }

    parseFunctionalExpression(): UrbanStatsASTExpression | ParseError {
        let fn = this.parseSingleExpression()
        if (fn.type === 'error') {
            return fn
        }
        while (true) {
            let done = true
            const args = this.parseParenthesizedArgs()
            if (args !== undefined) {
                done = false
                if (args.type === 'error') {
                    return args
                }
                fn = {
                    type: 'function',
                    fn,
                    entireLoc: unify(locationOf(fn), args.args[1]),
                    args: args.args[0],
                }
            }
            if (this.consumeOperator('.')) {
                done = false
                if (!this.consumeIdentifier()) {
                    return { type: 'error', value: 'Expected identifier after the dot', location: this.maybeLastNonEOLToken().location }
                }
                const token = this.tokens[this.index - 1]
                assert(token.token.type === 'identifier', `Expected identifier token, but got ${token.token.type}`)
                fn = {
                    type: 'attribute',
                    expr: fn,
                    name: { node: token.token.value, location: token.location },
                }
            }
            if (done) {
                break
            }
        }
        return fn
    }

    parseExpression(): UrbanStatsASTExpression | ParseError {
        if (this.consumeIdentifier('if')) {
            return this.parseIfExpression()
        }

        const operatorExpSequence: USSInfixSequenceElement[] = []
        // State Machine with states expressionOrUnaryOperator; binaryOperator
        let state: 'expressionOrUnaryOperator' | 'binaryOperator' = 'expressionOrUnaryOperator'
        loop: while (true) {
            switch (state) {
                case 'expressionOrUnaryOperator': {
                    if (this.consumeOperator(...unaryOperators)) {
                        const operator = this.tokens[this.index - 1]
                        assert(operator.token.type === 'operator', 'Expected operator token')
                        operatorExpSequence.push({
                            type: 'operator',
                            operatorType: 'unary',
                            value: { node: operator.token.value, location: operator.location },
                        })
                        continue
                    }
                    else {
                        const expr = this.parseFunctionalExpression()
                        if (expr.type === 'error') {
                            return expr
                        }
                        operatorExpSequence.push(expr)
                        state = 'binaryOperator'
                    }
                }
                    break
                case 'binaryOperator': {
                    if (this.consumeOperator(...infixOperators)) {
                        const operator = this.tokens[this.index - 1]
                        assert(operator.token.type === 'operator', 'Expected operator token')
                        operatorExpSequence.push({
                            type: 'operator',
                            operatorType: 'binary',
                            value: { node: operator.token.value, location: operator.location },
                        })
                        state = 'expressionOrUnaryOperator'
                    }
                    else {
                        break loop
                    }
                }
            }
        }
        return this.parseInfixSequence(operatorExpSequence)
    }

    parseInfixSequence(operatorExpSequence: USSInfixSequenceElement[]): UrbanStatsASTExpression | ParseError {
        assert(operatorExpSequence.length !== 0, 'Expected expression')
        if (operatorExpSequence.length === 1) {
            assert(operatorExpSequence[0].type !== 'operator', `Unexpected operator ${JSON.stringify(operatorExpSequence[0])} at beginning of infix sequence`)
            return operatorExpSequence[0]
        }
        // Get the highest precedence operator
        const precedences = operatorExpSequence.map(x => x.type === 'operator' ? expressionOperatorMap.get(x.value.node)?.precedence ?? 0 : 0)
        const maxPrecedence = Math.max(...precedences)
        assert(maxPrecedence > 0, 'No valid operator found in infix sequence')
        const index = precedences.findIndex(p => p === maxPrecedence)
        assert(index > -1, 'No operator found with maximum precedence; this should not happen')
        return this.parseInfixSequence(this.resolveOperator(operatorExpSequence, index))
    }

    resolveOperator(operatorExpSequence: USSInfixSequenceElement[], index: number): USSInfixSequenceElement[] {
        assert(operatorExpSequence[index].type === 'operator', `Expected operator at index ${index}, but found expression: ${JSON.stringify(operatorExpSequence[index])}`)
        const next = operatorExpSequence[index + 1]
        if (next.type === 'operator') {
            return this.resolveOperator(operatorExpSequence, index + 1)
        }
        switch (operatorExpSequence[index].operatorType) {
            case 'unary': {
                return [
                    ...operatorExpSequence.slice(0, index),
                    { type: 'unaryOperator', operator: operatorExpSequence[index].value, expr: next },
                    ...operatorExpSequence.slice(index + 2),
                ]
            }
            case 'binary': {
                // Split the sequence into left and right parts
                const left = operatorExpSequence[index - 1]
                const right = operatorExpSequence[index + 1]
                assert(left.type !== 'operator' && right.type !== 'operator', 'unreachable: left or right should not be an operator')
                return [
                    ...operatorExpSequence.slice(0, index - 1),
                    { type: 'binaryOperator', operator: operatorExpSequence[index].value, left, right },
                    ...operatorExpSequence.slice(index + 2),
                ]
            }
        }
    }

    checkLHS(expr: UrbanStatsASTExpression): UrbanStatsASTLHS | ParseError {
        switch (expr.type) {
            case 'identifier':
            case 'attribute':
                return expr
            case 'constant':
            case 'function':
            case 'unaryOperator':
            case 'binaryOperator':
            case 'vectorLiteral':
            case 'objectLiteral':
            case 'if':
                return { type: 'error', value: 'Cannot assign to this expression', location: locationOf(expr) }
        }
    }

    parseStatement(): UrbanStatsASTStatement | ParseError {
        const expr = this.parseExpression()
        if (expr.type === 'error') {
            return expr
        }
        if (this.consumeOperator('=')) {
            const value = this.parseExpression()
            if (value.type === 'error') {
                return value
            }
            const lhs = this.checkLHS(expr)
            if (lhs.type === 'error') {
                return lhs
            }
            return { type: 'assignment', lhs, value }
        }
        return { type: 'expression', value: expr }
    }

    parseIfExpression(): UrbanStatsASTExpression | ParseError {
        const ifToken = this.tokens[this.index - 1]
        if (!this.consumeBracket('(')) {
            return { type: 'error', value: 'Expected opening bracket ( after if', location: this.maybeLastNonEOLToken().location }
        }
        const condition = this.parseExpression()
        if (condition.type === 'error') {
            return condition
        }
        if (!this.consumeBracket(')')) {
            return { type: 'error', value: 'Expected closing bracket ) after if condition', location: this.maybeLastNonEOLToken().location }
        }
        if (!this.consumeBracket('{')) {
            return { type: 'error', value: 'Expected opening bracket { after if condition', location: this.maybeLastNonEOLToken().location }
        }
        const then = this.parseStatements(true, () => this.consumeBracket('}'), 'Expected } after if block')
        if (then.type === 'error') {
            return then
        }
        let elseBranch: UrbanStatsASTStatement | undefined = undefined
        if (this.consumeIdentifier('else')) {
            if (!this.consumeBracket('{')) {
                return { type: 'error', value: 'Expected opening bracket { after else', location: this.maybeLastNonEOLToken().location }
            }
            const eb = this.parseStatements(true, () => this.consumeBracket('}'), 'Expected } after else block')
            if (eb.type === 'error') {
                return eb
            }
            elseBranch = eb
        }
        const lastToken = this.tokens[this.index - 1]
        return {
            type: 'if',
            entireLoc: unify(ifToken.location, lastToken.location),
            condition,
            then,
            else: elseBranch,
        }
    }

    parseStatements(canEnd: boolean = false, end: () => boolean = () => false, errMsg: string = 'Expected end of line or ; after'): UrbanStatsASTStatement | ParseError {
        const statements: UrbanStatsASTStatement[] = []
        while (this.index < this.tokens.length) {
            if (end()) {
                break
            }
            const statement = this.parseStatement()
            if (statement.type === 'error') {
                return statement
            }
            statements.push(statement)
            if (end()) {
                break
            }
            if (!this.consumeOperator('EOL', ';')) {
                return { type: 'error', value: errMsg, location: this.maybeLastNonEOLToken().location }
            }
            while (this.skipEOL()) { }
        }
        if (this.index === this.tokens.length && canEnd) {
            return { type: 'error', value: errMsg, location: this.maybeLastNonEOLToken().location }
        }
        if (statements.length === 1) {
            return statements[0]
        }
        const entireLoc: LocInfo = statements.length > 0
            ? unify(...statements.map(locationOf))
            : this.index > 0
                ? this.tokens[this.index - 1].location
                /* c8 ignore next -- This case should not happen in practice, but we handle it gracefully */
                : newLocation({ start: { lineIdx: 0, colIdx: 0 }, end: { lineIdx: 0, colIdx: 0 } })
        return { type: 'statements', result: statements, entireLoc }
    }
}

export function parse(code: string): ReturnType<typeof parseTokens> {
    const tokens = lex(code)
    return parseTokens(tokens)
}

export function parseTokens(tokens: AnnotatedToken[]): UrbanStatsASTStatement | { type: 'error', errors: ParseError[] } {
    const lexErrors = tokens.filter(token => token.token.type === 'error')
    if (lexErrors.length > 0) {
        return { type: 'error', errors: lexErrors.map(token => ({ type: 'error', value: `Unrecognized token: ${token.token.value}`, location: token.location })) }
    }
    const state = new ParseState(tokens as AnnotatedTokenWithValue[]) // we checked for errors above, so this cast is safe
    const stmts = state.parseStatements()
    if (stmts.type === 'error') {
        return { type: 'error', errors: [stmts] }
    }
    assert(state.index === state.tokens.length, `Parser did not consume all tokens: ${state.index} < ${state.tokens.length}`)
    return stmts
}

function allExpressions(node: UrbanStatsASTStatement | UrbanStatsASTExpression): UrbanStatsASTExpression[] {
    const expressions: UrbanStatsASTExpression[] = []
    function helper(n: UrbanStatsASTStatement | UrbanStatsASTExpression | UrbanStatsASTArg): boolean {
        switch (n.type) {
            case 'unnamed':
                helper(n.value)
                return true
            case 'named':
                expressions.push(n.value)
                helper(n.value)
                return true
            case 'constant':
            case 'identifier':
                expressions.push(n)
                return true
            case 'attribute':
                expressions.push(n)
                helper(n.expr)
                return true
            case 'function':
                expressions.push(n)
                helper(n.fn)
                n.args.forEach(helper)
                return true
            case 'unaryOperator':
                expressions.push(n)
                helper(n.expr)
                return true
            case 'binaryOperator':
                expressions.push(n)
                helper(n.left)
                helper(n.right)
                return true
            case 'objectLiteral':
                expressions.push(n)
                n.properties.forEach(([key, value]) => {
                    expressions.push({ type: 'constant', value: { node: key, location: n.entireLoc } })
                    helper(value)
                })
                return true
            case 'vectorLiteral':
                expressions.push(n)
                n.elements.forEach(helper)
                return true
            case 'assignment':
                helper(n.lhs)
                helper(n.value)
                return true
            case 'expression':
                helper(n.value)
                return true
            case 'statements':
                n.result.forEach(helper)
                return true
            case 'if':
                helper(n.condition)
                helper(n.then)
                if (n.else) {
                    helper(n.else)
                }
                return true
        }
    }
    helper(node)
    return expressions
}

export function allIdentifiers(node: UrbanStatsASTStatement | UrbanStatsASTExpression): Set<string> {
    const identifiers = new Set<string>()
    allExpressions(node).forEach((expr) => {
        if (expr.type === 'identifier') {
            identifiers.add(expr.name.node)
        }
    })
    return identifiers
}
