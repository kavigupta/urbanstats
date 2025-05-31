import { AnnotatedToken, infixOperators, LocInfo } from './lexer'

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
    | { type: 'function', fn: UrbanStatsASTExpression, args: UrbanStatsASTArg[] }
    | { type: 'infixSequence', operators: Decorated<string>[], expressions: UrbanStatsASTExpression[] }
    | { type: 'if', condition: UrbanStatsASTExpression, then: UrbanStatsASTStatement, else?: UrbanStatsASTStatement }
)

export type UrbanStatsASTStatement = (
    { type: 'assignment', lhs: UrbanStatsASTLHS, value: UrbanStatsASTExpression }
    | { type: 'expression', value: UrbanStatsASTExpression }
    | { type: 'statements', result: UrbanStatsASTStatement[] }
)

type UrbanStatsAST = UrbanStatsASTArg | UrbanStatsASTExpression | UrbanStatsASTStatement
interface ParseError { type: 'error', message: string, location: LocInfo }

function unify(...locations: (LocInfo | undefined)[]): LocInfo | undefined {
    const definedLocations = locations.filter((loc): loc is LocInfo => loc !== undefined)
    if (definedLocations.length === 0) {
        return undefined
    }
    const start = definedLocations.reduce((min, loc) => Math.min(min, loc.startIdx), Number.MAX_VALUE)
    const end = definedLocations.reduce((max, loc) => Math.max(max, loc.endIdx), Number.MIN_VALUE)

    if (definedLocations.some(loc => loc.lineIdx !== definedLocations[0].lineIdx)) {
        // TODO!! handle multiple lines
        // log here to fail lint so we fix this
        console.log('Warning: multiple lines in unify')
        throw new Error('Multiple lines in unify')
    }
    return { lineIdx: definedLocations[0].lineIdx, startIdx: start, endIdx: end }
}

export function locationOf(node: UrbanStatsAST): LocInfo | undefined {
    switch (node.type) {
        case 'unnamed':
            return undefined
        case 'named':
            return unify(node.name.location, locationOf(node.value))
        case 'constant':
            return node.value.location
        case 'identifier':
            return node.name.location
        case 'attribute':
            return unify(node.name.location, locationOf(node.expr))
        case 'function':
            return unify(locationOf(node.fn), ...node.args.map(locationOf))
        case 'infixSequence':
            return unify(...node.operators.map(x => x.location), ...node.expressions.map(locationOf))
        case 'assignment':
            return unify(locationOf(node.lhs), locationOf(node.value))
        case 'expression':
            return locationOf(node.value)
        case 'statements':
            return unify(...node.result.map(locationOf))
        case 'if':
            const branches = [locationOf(node.condition), locationOf(node.then)]
            if (node.else) {
                branches.push(locationOf(node.else))
            }
            return unify(...branches)
    }
}

export function locationOfExpr(expr: UrbanStatsASTExpression): LocInfo {
    const loc = locationOf(expr)
    if (loc === undefined) {
        throw new Error('Location is undefined; this should not happen')
    }
    return loc
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
        case 'infixSequence':
            return `(infix (${node.operators.map(x => x.node).join(' ')}) (${node.expressions.map(toSExp).join(' ')}))`
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
    tokens: AnnotatedToken[]
    index: number
    constructor(tokens: AnnotatedToken[]) {
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

    parseSingleExpression(): UrbanStatsASTExpression | ParseError {
        while (this.skipEOL()) {}
        if (this.index >= this.tokens.length) {
            return { type: 'error', message: 'Unexpected end of input', location: this.tokens[this.index - 1].location }
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
                if (token.token.value === '(') {
                    this.index++
                    const expr = this.parseExpression()
                    if (expr.type === 'error') {
                        return expr
                    }
                    if (!this.consumeBracket(')')) {
                        return { type: 'error', message: 'Expected closing bracket )', location: token.location }
                    }
                    return expr
                }
                else if (token.token.value === ')') {
                    return { type: 'error', message: 'Unexpected closing bracket )', location: token.location }
                }
                else {
                    return { type: 'error', message: `Unexpected bracket ${token.token.value}`, location: token.location }
                }
            case 'operator':
                return { type: 'error', message: `Unexpected operator ${token.token.value}`, location: token.location }
            case 'error':
                this.index++
                return { type: 'error', message: `Error: ${token.token.value}`, location: token.location }
        }
    }

    parseArg(): UrbanStatsASTArg | ParseError {
        if (this.index >= this.tokens.length) {
            return { type: 'error', message: 'Unexpected end of input', location: this.tokens[this.index - 1].location }
        }
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
            return { type: 'error', message: 'Expected identifier for named argument', location: locationOfExpr(exprOrName) }
        }
        return {
            type: 'named',
            name: { node: exprOrName.name.node, location: exprOrName.name.location },
            value: expr,
        }
    }

    parseParenthesizedArgs(): { type: 'args', args: UrbanStatsASTArg[] } | ParseError | undefined {
        if (!this.consumeBracket('(')) {
            return undefined
        }
        const args: UrbanStatsASTArg[] = []
        while (true) {
            if (this.consumeBracket(')')) {
                return { type: 'args', args }
            }
            if (args.length > 0 && !this.consumeOperator(',')) {
                return { type: 'error', message: `Expected comma , or closing bracket ); instead received ${this.tokens[this.index].token.value}`, location: this.tokens[this.index].location }
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
                    args: args.args,
                }
            }
            if (this.consumeOperator('.')) {
                done = false
                if (!this.consumeIdentifier()) {
                    return { type: 'error', message: 'Expected identifier after .', location: this.tokens[this.index - 1].location }
                }
                const token = this.tokens[this.index - 1]
                if (token.token.type !== 'identifier') {
                    throw new Error('Expected identifier token')
                }
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

        // return this.parseFunctionalExpression()
        const operators: Decorated<string>[] = []
        const expressions: UrbanStatsASTExpression[] = []
        while (true) {
            const expr = this.parseFunctionalExpression()
            if (expr.type === 'error') {
                return expr
            }
            expressions.push(expr)
            if (!this.consumeOperator(...infixOperators)) {
                break
            }
            const operator = this.tokens[this.index - 1]
            if (operator.token.type !== 'operator') {
                throw new Error('Expected operator token')
            }
            operators.push({ node: operator.token.value, location: operator.location })
        }
        if (expressions.length === 1) {
            return expressions[0]
        }
        return {
            type: 'infixSequence',
            operators,
            expressions,
        }
    }

    checkLHS(expr: UrbanStatsASTExpression): UrbanStatsASTLHS | ParseError {
        switch (expr.type) {
            case 'identifier':
            case 'attribute':
                return expr
            case 'constant':
            case 'function':
            case 'infixSequence':
            case 'if':
                return { type: 'error', message: 'Invalid LHS expression', location: locationOfExpr(expr) }
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
        if (!this.consumeBracket('(')) {
            return { type: 'error', message: 'Expected opening bracket ( after if', location: this.tokens[this.index - 1].location }
        }
        const condition = this.parseExpression()
        if (condition.type === 'error') {
            return condition
        }
        if (!this.consumeBracket(')')) {
            return { type: 'error', message: 'Expected closing bracket ) after if condition', location: this.tokens[this.index - 1].location }
        }
        if (!this.consumeBracket('{')) {
            return { type: 'error', message: 'Expected opening bracket { after if condition', location: this.tokens[this.index - 1].location }
        }
        const then = this.parseStatement()
        if (then.type === 'error') {
            return then
        }
        if (!this.consumeBracket('}')) {
            return { type: 'error', message: 'Expected closing bracket } after if then statement', location: this.tokens[this.index - 1].location }
        }
        let elseBranch: UrbanStatsASTStatement | undefined = undefined
        if (this.consumeIdentifier('else')) {
            if (!this.consumeBracket('{')) {
                return { type: 'error', message: 'Expected opening bracket { after else', location: this.tokens[this.index - 1].location }
            }
            const eb = this.parseStatement()
            if (eb.type === 'error') {
                return eb
            }
            elseBranch = eb
            if (!this.consumeBracket('}')) {
                return { type: 'error', message: 'Expected closing bracket } after else statement', location: this.tokens[this.index - 1].location }
            }
        }
        return {
            type: 'if',
            condition,
            then,
            else: elseBranch,
        }
    }

    parseStatements(): UrbanStatsASTStatement | ParseError {
        const statements: UrbanStatsASTStatement[] = []
        while (this.index < this.tokens.length) {
            const statement = this.parseStatement()
            if (statement.type === 'error') {
                return statement
            }
            if (!this.consumeOperator('EOL', ';')) {
                return { type: 'error', message: 'Expected end of line or ; after', location: this.tokens[this.index - 1].location }
            }
            while (this.skipEOL()) {}
            statements.push(statement)
        }
        if (statements.length === 1) {
            return statements[0]
        }
        return { type: 'statements', result: statements }
    }
}

export function parse(tokens: AnnotatedToken[]): UrbanStatsASTStatement | ParseError {
    const state = new ParseState(tokens)
    const stmts = state.parseStatements()
    if (state.index < state.tokens.length) {
        return { type: 'error', message: 'Unexpected tokens at end of input', location: state.tokens[state.index].location }
    }
    return stmts
}
