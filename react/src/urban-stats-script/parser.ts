import { AnnotatedToken, expressionOperatorMap, infixOperators, lex, LocInfo, unaryOperators } from './lexer'

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
    | { type: 'binaryOperator', operator: Decorated<string>, left: UrbanStatsASTExpression, right: UrbanStatsASTExpression }
    | { type: 'unaryOperator', operator: Decorated<string>, expr: UrbanStatsASTExpression }
    | { type: 'if', condition: UrbanStatsASTExpression, then: UrbanStatsASTStatement, else?: UrbanStatsASTStatement }
)

export type UrbanStatsASTStatement = (
    { type: 'assignment', lhs: UrbanStatsASTLHS, value: UrbanStatsASTExpression }
    | { type: 'expression', value: UrbanStatsASTExpression }
    | { type: 'statements', result: UrbanStatsASTStatement[] }
)

type UrbanStatsAST = UrbanStatsASTArg | UrbanStatsASTExpression | UrbanStatsASTStatement
interface ParseError { type: 'error', message: string, location: LocInfo }

type USSInfixSequenceElement = { type: 'operator', operatorType: 'unary' | 'binary', value: Decorated<string> } | UrbanStatsASTExpression

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
        case 'unaryOperator':
            return unify(node.operator.location, locationOf(node.expr))
        case 'binaryOperator':
            return unify(locationOf(node.left), locationOf(node.right), node.operator.location)
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
        case 'unaryOperator':
            return `(${node.operator.node} ${toSExp(node.expr)})`
        case 'binaryOperator':
            return `(${node.operator.node} ${toSExp(node.left)} ${toSExp(node.right)})`
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

        const operatorExpSequence: USSInfixSequenceElement[] = []
        // State Machine with states expressionOrUnaryOperator; binaryOperator
        let state: 'expressionOrUnaryOperator' | 'binaryOperator' = 'expressionOrUnaryOperator'
        loop: while (true) {
            switch (state) {
                case 'expressionOrUnaryOperator': {
                    if (this.consumeOperator(...unaryOperators)) {
                        const operator = this.tokens[this.index - 1]
                        if (operator.token.type !== 'operator') {
                            throw new Error('Expected operator token')
                        }
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
                        if (operator.token.type !== 'operator') {
                            throw new Error('Expected operator token')
                        }
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
        if (operatorExpSequence.length === 0) {
            return { type: 'error', message: 'Expected expression', location: this.tokens[this.index - 1].location }
        }
        if (operatorExpSequence.length === 1) {
            if (operatorExpSequence[0].type === 'operator') {
                return { type: 'error', message: `Unexpected operator ${operatorExpSequence[0].value.node}`, location: operatorExpSequence[0].value.location }
            }
            return operatorExpSequence[0]
        }
        // Get the highest precedence operator
        const precedences = operatorExpSequence.map(x => x.type === 'operator' ? expressionOperatorMap.get(x.value.node)?.precedence ?? 0 : 0)
        const maxPrecedence = Math.max(...precedences)
        if (maxPrecedence === 0) {
            return { type: 'error', message: 'No valid operator found in infix sequence', location: this.tokens[this.index - 1].location }
        }
        const index = precedences.findIndex(p => p === maxPrecedence)
        if (index === -1) {
            throw new Error('No operator found with maximum precedence; this should not happen')
        }
        return this.parseInfixSequence(this.resolveOperator(operatorExpSequence, index))
    }

    resolveOperator(operatorExpSequence: USSInfixSequenceElement[], index: number): USSInfixSequenceElement[] {
        if (operatorExpSequence[index].type !== 'operator') {
            throw new Error(`Expected operator at index ${index}, but found expression: ${JSON.stringify(operatorExpSequence[index])}`)
        }
        if (operatorExpSequence[index + 1].type === 'operator') {
            return this.resolveOperator(operatorExpSequence, index + 1)
        }
        switch (operatorExpSequence[index].operatorType) {
            case 'unary': {
                const expr = operatorExpSequence[index + 1]
                if (expr.type === 'operator') {
                    return this.resolveOperator(operatorExpSequence, index + 1)
                }
                return [
                    ...operatorExpSequence.slice(0, index),
                    { type: 'unaryOperator', operator: operatorExpSequence[index].value, expr },
                    ...operatorExpSequence.slice(index + 2),
                ]
            }
            case 'binary': {
                // Split the sequence into left and right parts
                const left = operatorExpSequence[index - 1]
                const right = operatorExpSequence[index + 1]
                if (left.type === 'operator' || right.type === 'operator') {
                    throw new Error('unreachable: left or right should not be an operator')
                }
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
        const then = this.parseStatements(() => this.consumeBracket('}'))
        if (then.type === 'error') {
            return then
        }
        let elseBranch: UrbanStatsASTStatement | undefined = undefined
        if (this.consumeIdentifier('else')) {
            if (!this.consumeBracket('{')) {
                return { type: 'error', message: 'Expected opening bracket { after else', location: this.tokens[this.index - 1].location }
            }
            const eb = this.parseStatements(() => this.consumeBracket('}'))
            if (eb.type === 'error') {
                return eb
            }
            elseBranch = eb
        }
        return {
            type: 'if',
            condition,
            then,
            else: elseBranch,
        }
    }

    parseStatements(end: () => boolean = () => false): UrbanStatsASTStatement | ParseError {
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
                return { type: 'error', message: 'Expected end of line or ; after', location: this.tokens[this.index - 1].location }
            }
            while (this.skipEOL()) {}
        }
        if (statements.length === 1) {
            return statements[0]
        }
        return { type: 'statements', result: statements }
    }
}

export function parse(code: string): UrbanStatsASTStatement | { type: 'error', errors: ParseError[] } {
    const tokens = lex(code)
    const lexErrors = tokens.filter(token => token.token.type === 'error')
    if (lexErrors.length > 0) {
        return { type: 'error', errors: lexErrors.map(token => ({ type: 'error', message: `Unrecognized token: ${token.token.value}`, location: token.location })) }
    }
    const state = new ParseState(tokens)
    const stmts = state.parseStatements()
    if (stmts.type === 'error') {
        return { type: 'error', errors: [stmts] }
    }
    if (state.index < state.tokens.length) {
        const error = { type: 'error', message: `Cannot parse token: ${state.tokens[state.index].token.value}`, location: state.tokens[state.index].location } satisfies ParseError
        return { type: 'error', errors: [error] }
    }
    return stmts
}
