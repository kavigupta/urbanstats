import { assert } from '../utils/defensive'

import { locationOf, unify, UrbanStatsAST, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTLHS, UrbanStatsASTStatement } from './ast'
import { getAutoUXNodeMetadata } from './autoux-node-metadata'
import { Context } from './context'
import { AnnotatedToken, AnnotatedTokenWithValue, lex, Keyword, emptyLocation } from './lexer'
import { noLocation, LocInfo, Block } from './location'
import { expressionOperatorMap, infixOperators, unaryOperators } from './operators'
import { USSType } from './types-values'

export interface Decorated<T> {
    node: T
    location: LocInfo
}

export interface ParseError { type: 'error', value: string, location: LocInfo }

type USSInfixSequenceElement = { type: 'operator', operatorType: 'unary' | 'binary', value: Decorated<string> } | UrbanStatsASTExpression

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
            return `(const ${node.value.node.value})`
        case 'identifier':
            return `(id ${node.name.node})`
        case 'attribute':
            return `(attr ${toSExp(node.expr)} ${node.name.node})`
        case 'call':
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
        case 'do':
            return `(do ${node.statements.map(toSExp).join(' ')})`
        case 'condition':
            return `(condition ${toSExp(node.condition)} ${node.rest.map(toSExp).join(' ')})`
        case 'parseError':
            return `(parseError ${JSON.stringify(node.originalCode)} ${JSON.stringify(node.errors)})`
        case 'autoUXNode':
            return `(autoUX ${toSExp(node.expr)} ${JSON.stringify(node.metadata)})`
        case 'customNode':
            return `(customNode ${toSExp(node.expr)} ${JSON.stringify(node.originalCode)})`
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

    consumeIdentifier(): boolean {
        return this.consumeTokenOfType('identifier')
    }

    consumeKeyword(...oneOfKeywords: Keyword[]): boolean {
        return this.consumeTokenOfType('keyword', ...oneOfKeywords)
    }

    maybeLastNonEOLToken(offset: number): AnnotatedTokenWithValue {
        for (let i = this.index + offset; i >= 0; i--) {
            const token = this.tokens[i]
            if (token.token.type !== 'operator' || token.token.value !== 'EOL') {
                return token
            }
        }
        return this.tokens[this.index + offset]
    }

    parseSingleExpression(): UrbanStatsASTExpression | ParseError {
        while (this.skipEOL()) { }
        if (this.index >= this.tokens.length) {
            return { type: 'error', value: 'Unexpected end of input', location: this.maybeLastNonEOLToken(-1).location }
        }
        const token = this.tokens[this.index]
        switch (token.token.type) {
            case 'number':
                this.index++
                return { type: 'constant', value: { node: { type: 'number', value: token.token.value }, location: token.location } }
            case 'string':
                this.index++
                return { type: 'constant', value: { node: { type: 'string', value: token.token.value }, location: token.location } }
            case 'identifier':
                this.index++
                return { type: 'identifier', name: { node: token.token.value, location: token.location } }
            case 'keyword':
                return { type: 'error', value: `Unexpected keyword ${token.token.value}`, location: token.location }
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
                                return { type: 'error', value: 'Expected identifier for object field name', location: this.maybeLastNonEOLToken(-1).location }
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
                                return { type: 'error', value: 'Expected comma , or closing bracket ] after vector element', location: this.maybeLastNonEOLToken(0).location }
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
        if (this.consumeKeyword('autoUXNode')) {
            return this.parseAutoUXExpression()
        }
        if (this.consumeKeyword('customNode')) {
            return this.parseCustomNodeExpression()
        }

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
                    type: 'call',
                    fn,
                    entireLoc: unify(locationOf(fn), args.args[1]),
                    args: args.args[0],
                }
            }
            if (this.consumeOperator('.')) {
                done = false
                if (!this.consumeIdentifier()) {
                    return { type: 'error', value: 'Expected identifier after the dot', location: this.maybeLastNonEOLToken(-1).location }
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
        if (this.consumeKeyword('if')) {
            return this.parseIfExpression()
        }

        if (this.consumeKeyword('do')) {
            return this.parseDoExpression()
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
            case 'call':
            case 'unaryOperator':
            case 'binaryOperator':
            case 'vectorLiteral':
            case 'objectLiteral':
            case 'if':
            case 'do':
            case 'autoUXNode':
            case 'customNode':
                return { type: 'error', value: 'Cannot assign to this expression', location: locationOf(expr) }
        }
    }

    parseStatement(): UrbanStatsASTStatement | ParseError {
        if (this.consumeKeyword('condition')) {
            return this.parseConditionStatement()
        }

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
            return { type: 'error', value: 'Expected opening bracket ( after if', location: this.maybeLastNonEOLToken(-1).location }
        }
        const condition = this.parseExpression()
        if (condition.type === 'error') {
            return condition
        }
        if (!this.consumeBracket(')')) {
            return { type: 'error', value: 'Expected closing bracket ) after if condition', location: this.maybeLastNonEOLToken(-1).location }
        }
        if (!this.consumeBracket('{')) {
            return { type: 'error', value: 'Expected opening bracket { after if condition', location: this.maybeLastNonEOLToken(-1).location }
        }
        const then = this.parseStatements(true, () => this.consumeBracket('}'), 'Expected } after if block')
        if (then.type === 'error') {
            return then
        }
        let elseBranch: UrbanStatsASTStatement | undefined = undefined
        if (this.consumeKeyword('else')) {
            if (!this.consumeBracket('{')) {
                return { type: 'error', value: 'Expected opening bracket { after else', location: this.maybeLastNonEOLToken(-1).location }
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

    parseDoExpression(): UrbanStatsASTExpression | ParseError {
        const doToken = this.tokens[this.index - 1]
        if (!this.consumeBracket('{')) {
            return { type: 'error', value: 'Expected opening bracket { after do', location: this.maybeLastNonEOLToken(-1).location }
        }
        const statements = this.parseStatements(true, () => this.consumeBracket('}'), 'Expected } after do block')
        if (statements.type === 'error') {
            return statements
        }
        const lastToken = this.tokens[this.index - 1]
        return {
            type: 'do',
            entireLoc: unify(doToken.location, lastToken.location),
            statements: statements.type === 'statements' ? statements.result : [statements],
        }
    }

    parseConditionStatement(): UrbanStatsASTStatement | ParseError {
        const conditionToken = this.tokens[this.index - 1]
        if (!this.consumeBracket('(')) {
            return { type: 'error', value: 'Expected opening bracket ( after condition', location: this.maybeLastNonEOLToken(-1).location }
        }
        const condition = this.parseExpression()
        if (condition.type === 'error') {
            return condition
        }
        if (!this.consumeBracket(')')) {
            return { type: 'error', value: 'Expected closing bracket ) after condition', location: this.maybeLastNonEOLToken(-1).location }
        }
        return {
            type: 'condition',
            entireLoc: unify(conditionToken.location, this.tokens[this.index - 1].location),
            condition,
            rest: [],
        }
    }

    parseStatements(canEnd: boolean = false, end: () => boolean = () => false, errMsg: string = 'Expected end of line or ; after'): UrbanStatsASTStatement | ParseError {
        const statements: UrbanStatsASTStatement[] = []
        while (this.index < this.tokens.length) {
            if (end()) {
                break
            }
            while (this.skipEOL()) { }
            if (this.index >= this.tokens.length) {
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
                return { type: 'error', value: errMsg, location: this.maybeLastNonEOLToken(-1).location }
            }
            while (this.skipEOL()) { }
        }
        if (this.index === this.tokens.length && canEnd) {
            return { type: 'error', value: errMsg, location: this.maybeLastNonEOLToken(-1).location }
        }
        return mergeStatements(
            statements,
            this.index > 0
                ? this.tokens[this.index - 1].location
                /* c8 ignore next -- This case should not happen in practice, but we handle it gracefully */
                : undefined,
        )
    }

    parseCustomNodeExpression(): UrbanStatsASTExpression | ParseError {
        const argsRes = this.parseParenthesizedArgs()

        if (argsRes === undefined) {
            return { type: 'error', value: 'Expected arguments for customNode', location: this.maybeLastNonEOLToken(-1).location }
        }

        if (argsRes.type === 'error') {
            return argsRes
        }

        const [args, locArg] = argsRes.args

        const code = args[0]

        if (args.length !== 1 || code.type !== 'unnamed') {
            return { type: 'error', value: 'Incorrect arguments for customNode, expected 1 unnamed argument', location: argsRes.args[1] }
        }

        if (code.value.type !== 'constant' || code.value.value.node.type !== 'string') {
            return { type: 'error', value: 'Expected string constant as argument to customNode', location: locationOf(code) }
        }

        const parseResult = parse(code.value.value.node.value, code.value.value.location.start.block)

        if (parseResult.type === 'error') {
            return {
                type: 'customNode',
                expr: {
                    type: 'parseError',
                    errors: parseResult.errors,
                    originalCode: code.value.value.node.value,
                },
                originalCode: code.value.value.node.value,
                entireLoc: locArg,
            }
        }

        return {
            type: 'customNode',
            expr: parseResult,
            originalCode: code.value.value.node.value,
            entireLoc: locArg,
        }
    }

    parseAutoUXExpression(): UrbanStatsASTExpression | ParseError {
        const argsRes = this.parseParenthesizedArgs()

        if (argsRes === undefined) {
            return { type: 'error', value: 'Expected arguments for autoUX', location: this.maybeLastNonEOLToken(-1).location }
        }

        if (argsRes.type === 'error') {
            return argsRes
        }

        const [args, locArg] = argsRes.args

        if (args.length !== 2 || args[0].type !== 'unnamed' || args[1].type !== 'unnamed') {
            return { type: 'error', value: 'autoUX requires exactly 2 unnamed arguments: expression and metadata JSON string', location: locArg }
        }

        const expr = args[0].value
        const metadata = args[1].value

        // Validate that metadata is a string
        if (metadata.type !== 'constant' || metadata.value.node.type !== 'string') {
            return { type: 'error', value: 'Second argument to autoUX must be a string', location: locationOf(metadata) }
        }

        return {
            type: 'autoUXNode',
            expr,
            metadata: getAutoUXNodeMetadata(metadata.value.node.value),
            entireLoc: locArg,
        }
    }
}

export function mergeStatements(statements: UrbanStatsASTStatement[], fallbackLocation?: LocInfo): UrbanStatsASTStatement {
    statements = gulpRestForConditions(statements)
    if (statements.length === 1) {
        return statements[0]
    }
    const entireLoc: LocInfo = statements.length > 0
        ? unify(...statements.map(locationOf))
        : fallbackLocation
        /* c8 ignore next -- This case should not happen in practice, but we handle it gracefully */
        ?? noLocation
    return { type: 'statements', result: statements, entireLoc }
}

function gulpRestForConditions(statements: UrbanStatsASTStatement[]): UrbanStatsASTStatement[] {
    /**
     * Handle condition statements by gulping the next statement into the condition's rest.
     */
    const result: UrbanStatsASTStatement[] = []
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]
        if (stmt.type === 'condition') {
            stmt.rest.push(...gulpRestForConditions(statements.slice(i + 1)))
            result.push(stmt)
            break
        }
        result.push(stmt)
    }
    return result
}

export function parse(code: string, block?: Block, returnParseErrorNode: boolean = false): UrbanStatsASTStatement | { type: 'error', errors: ParseError[] } {
    const tokens = lex(block ?? { type: 'multi' }, code)
    return parseTokens(tokens, code, returnParseErrorNode)
}

export function parseTokens(tokens: AnnotatedToken[], originalCode: string, returnParseErrorNode: boolean = false): UrbanStatsASTStatement | { type: 'error', errors: ParseError[] } {
    const lexErrors = tokens.filter(token => token.token.type === 'error')
    if (lexErrors.length > 0) {
        const errors: ParseError[] = lexErrors.map(token => ({ type: 'error' as const, value: `Unrecognized token: ${token.token.value}`, location: token.location }))
        if (returnParseErrorNode) {
            return { type: 'parseError', originalCode, errors }
        }
        return { type: 'error', errors }
    }
    const state = new ParseState(tokens as AnnotatedTokenWithValue[]) // we checked for errors above, so this cast is safe
    const stmts = state.parseStatements()
    if (stmts.type === 'error') {
        if (returnParseErrorNode) {
            return { type: 'parseError', originalCode, errors: [stmts] }
        }
        return { type: 'error', errors: [stmts] }
    }
    assert(state.index === state.tokens.length, `Parser did not consume all tokens: ${state.index} < ${state.tokens.length}`)
    return stmts
}

function leafExpressions(node: UrbanStatsASTStatement | UrbanStatsASTExpression): UrbanStatsASTExpression[] {
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
            case 'call':
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
                    expressions.push({ type: 'constant', value: { node: { type: 'string', value: key }, location: n.entireLoc } })
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
            case 'do':
                n.statements.forEach(helper)
                return true
            case 'condition':
                helper(n.condition)
                n.rest.forEach(helper)
                return true
            case 'parseError':
                return true
            case 'autoUXNode':
                helper(n.expr)
                return true
            case 'customNode':
                // do not actually put this in the expressions list, as is for internal use only
                helper(n.expr)
                return true
        }
    }
    helper(node)
    return expressions
}

function identifiersInExpr(node: UrbanStatsASTStatement | UrbanStatsASTExpression): Set<string> {
    const identifiers = new Set<string>()
    leafExpressions(node).forEach((expr) => {
        if (expr.type === 'identifier') {
            identifiers.add(expr.name.node)
        }
    })
    return identifiers
}

export function allIdentifiers(node: UrbanStatsASTStatement | UrbanStatsASTExpression, ctx: Context): Set<string> {
    const identifiers = identifiersInExpr(node)
    while (true) {
        // make sure to include identifiers from default values of function arguments pulled in by the identifiers
        const newIdentifiers = new Set<string>()
        identifiers.forEach((id) => {
            const t = ctx.getVariable(id)?.type
            if (t === undefined || t.type !== 'function') {
                return
            }
            Object.entries(t.namedArgs).forEach(([, arg]) => {
                const dv = arg.defaultValue
                if (dv === undefined) {
                    return
                }
                identifiersInExpr(dv).forEach((newId) => {
                    if (!identifiers.has(newId)) {
                        newIdentifiers.add(newId)
                    }
                })
            })
        })
        if (newIdentifiers.size === 0) {
            break
        }
        newIdentifiers.forEach(id => identifiers.add(id))
    }
    return identifiers
}

export function unparse(node: UrbanStatsASTStatement | UrbanStatsASTExpression, opts: { indent?: number, inline?: boolean, simplify?: boolean, expressionalContext?: boolean, wrap?: boolean } = {}): string {
    if (opts.inline) {
        assert(opts.expressionalContext ?? false, 'expressionalContext must be true if inline is true')
    }
    opts.indent = opts.indent ?? 0
    opts.wrap = opts.wrap ?? true
    function isSimpleExpression(expr: UrbanStatsASTExpression): boolean {
        return expr.type === 'identifier' || expr.type === 'vectorLiteral' || expr.type === 'constant' || expr.type === 'autoUXNode' || expr.type === 'customNode'
    }
    function indentSpaces(level: number): string {
        return '    '.repeat(level)
    }

    const characterLimit = 80 - indentSpaces(opts.indent).length

    switch (node.type) {
        case 'autoUXNode':
            if (opts.simplify) {
                return unparse(node.expr, opts)
            }
            return `autoUXNode(${unparse(node.expr, { ...opts, inline: true, expressionalContext: true })}, ${JSON.stringify(JSON.stringify(node.metadata))})`
        case 'customNode':
            if (!opts.simplify) {
                return `customNode(${JSON.stringify(node.originalCode)})`
            }
            if (opts.expressionalContext && node.expr.type !== 'expression') {
                return unparse({ type: 'do', statements: [node.expr], entireLoc: locationOf(node.expr) }, { ...opts, inline: true })
            }
            else {
                return node.originalCode.trim()
            }
        case 'parseError':
            return node.originalCode
        case 'constant':
            if (node.value.node.type === 'string') {
                return JSON.stringify(node.value.node.value)
            }
            else {
                return node.value.node.value.toString()
            }
        case 'identifier':
            return node.name.node
        case 'attribute':
            const exprStr = unparse(node.expr, { ...opts, inline: true, expressionalContext: true })
            return `${exprStr}.${node.name.node}`
        case 'call': {
            const fnStr = unparse(node.fn, { ...opts, inline: true, expressionalContext: true })
            const argsStr = node.args.map((arg) => {
                switch (arg.type) {
                    case 'unnamed':
                        return unparse(arg.value, { ...opts, inline: true, expressionalContext: true, wrap: false })
                    case 'named':
                        return `${arg.name.node}=${unparse(arg.value, { ...opts, inline: true, expressionalContext: true, wrap: false })}`
                }
            })
            const fnNeedsParens = !isSimpleExpression(node.fn)
            const fnWithParens = fnNeedsParens ? `(${fnStr})` : fnStr
            const notWrapped = `${fnWithParens}(${argsStr.join(', ')})`
            if (notWrapped.length > characterLimit && opts.wrap) {
                // Special case for one unnamed argument that's a vector literal
                if (node.args.length === 1 && node.args[0].type === 'unnamed' && node.args[0].value.type === 'vectorLiteral') {
                    return `${fnWithParens}(${unparse(node.args[0].value, { ...opts, inline: true, expressionalContext: true, wrap: true })})`
                }
                const wrappedArgs = node.args.map((arg) => {
                    switch (arg.type) {
                        case 'unnamed':
                            return `${indentSpaces(opts.indent! + 1)}${unparse(arg.value, { ...opts, inline: true, expressionalContext: true, wrap: true, indent: opts.indent! + 1 })}`
                        case 'named':
                            return `${indentSpaces(opts.indent! + 1)}${arg.name.node}=${unparse(arg.value, { ...opts, inline: true, expressionalContext: true, wrap: true, indent: opts.indent! + 1 })}`
                    }
                })
                return `${fnWithParens}(\n${wrappedArgs.join(',\n')}\n${indentSpaces(opts.indent)})`
            }
            return notWrapped
        }
        case 'unaryOperator':
            const unaryExprStr = unparse(node.expr, { ...opts, inline: true, expressionalContext: true })
            const needsParens = !isSimpleExpression(node.expr)
            const exprWithParens = needsParens ? `(${unaryExprStr})` : unaryExprStr
            return `${node.operator.node}${exprWithParens}`
        case 'binaryOperator':
            const leftStr = unparse(node.left, { ...opts, inline: true, expressionalContext: true })
            const rightStr = unparse(node.right, { ...opts, inline: true, expressionalContext: true })
            const opPrecedence = expressionOperatorMap.get(node.operator.node)?.precedence ?? 0
            let leftWithParens = leftStr
            if (node.left.type === 'binaryOperator') {
                const leftOpPrecedence = expressionOperatorMap.get(node.left.operator.node)?.precedence ?? 0
                if (leftOpPrecedence < opPrecedence) {
                    leftWithParens = `(${leftStr})`
                }
            }
            else if (!isSimpleExpression(node.left)) {
                leftWithParens = `(${leftStr})`
            }
            let rightWithParens = rightStr
            if (node.right.type === 'binaryOperator') {
                const rightOpPrecedence = expressionOperatorMap.get(node.right.operator.node)?.precedence ?? 0
                if (rightOpPrecedence <= opPrecedence) {
                    rightWithParens = `(${rightStr})`
                }
            }
            else if (!isSimpleExpression(node.right)) {
                rightWithParens = `(${rightStr})`
            }
            return `${leftWithParens} ${node.operator.node} ${rightWithParens}`
        case 'vectorLiteral': {
            const elementsStr = node.elements.map(elem => unparse(elem, { ...opts, inline: true, expressionalContext: true, wrap: false }))
            const notWrapped = `[${elementsStr.join(', ')}]`
            if (notWrapped.length > characterLimit && opts.wrap) {
                const wrappedElements = node.elements.map(elem => `${indentSpaces(opts.indent! + 1)}${unparse(elem, { ...opts, inline: true, expressionalContext: true, wrap: true, indent: opts.indent! + 1 })}`)
                return `[\n${wrappedElements.join(',\n')}\n${indentSpaces(opts.indent)}]`
            }
            return notWrapped
        }
        case 'objectLiteral': {
            const propertiesStr = node.properties.map(([key, value]) => {
                const valueStr = unparse(value, { ...opts, inline: true, expressionalContext: true, wrap: false })
                return `${key}: ${valueStr}`
            })
            const notWrapped = `{${propertiesStr.join(', ')}}`
            if (notWrapped.length > characterLimit && opts.wrap) {
                const wrappedProperties = node.properties.map(([key, value]) => {
                    const valueStr = unparse(value, { ...opts, inline: true, expressionalContext: true, wrap: true })
                    return `${indentSpaces(opts.indent! + 1)}${key}: ${valueStr}`
                })
                return `{\n${wrappedProperties.join(',\n')}\n${indentSpaces(opts.indent)}}`
            }
            return notWrapped
        }
        case 'assignment':
            const lhsStr = unparse(node.lhs, { ...opts, expressionalContext: true })
            const valueStr = unparse(node.value, { ...opts, expressionalContext: true })
            return opts.inline ? `${lhsStr} = ${valueStr}` : `${indentSpaces(opts.indent)}${lhsStr} = ${valueStr}`
        case 'expression':
            // despite being an expression, it is not in an expressional context if its parent is not
            return opts.inline ? unparse(node.value, opts) : `${indentSpaces(opts.indent)}${unparse(node.value, opts)}`
        case 'statements':
            const statementsStr = node.result
                .map(stmt => unparse(stmt, opts))
                .filter(s => s !== '' && s !== 'do {  }')
            return statementsStr.join(opts.inline ? '; ' : ';\n')
        case 'if':
            const conditionStr = unparse(node.condition, { ...opts, expressionalContext: true })
            const thenStr = unparse(node.then, { ...opts, indent: opts.indent + 1 })
            let ifStr = opts.inline
                ? `if (${conditionStr}) { ${thenStr} }`
                : `if (${conditionStr}) {\n${thenStr}\n${indentSpaces(opts.indent)}}`
            if (node.else) {
                const elseStr = unparse(node.else, { ...opts, indent: opts.indent + 1 })
                ifStr += opts.inline
                    ? ` else { ${elseStr} }`
                    : ` else {\n${elseStr}\n${indentSpaces(opts.indent)}}`
            }
            return ifStr
        case 'do':
            const doStatements = { type: 'statements' as const, result: node.statements, entireLoc: node.entireLoc }
            const doStr = unparse(doStatements, { ...opts, indent: opts.indent + 1 })
            return opts.inline
                ? `do { ${doStr} }`
                : `do {\n${doStr}\n${indentSpaces(opts.indent)}}`
        case 'condition':
            const condStr = unparse(node.condition, { ...opts, expressionalContext: true })
            const restStatements = { type: 'statements' as const, result: node.rest, entireLoc: node.entireLoc }
            const restStr = unparse(restStatements, opts)
            // If condition is literal "true", elide it
            if (opts.simplify && node.condition.type === 'identifier' && node.condition.name.node === 'true') {
                return restStr
            }
            return `${indentSpaces(opts.indent)}condition (${condStr})\n${restStr}`
    }
}

export function parseNoError(uss: string, blockId: string): UrbanStatsASTStatement {
    const result = parse(uss, { type: 'single', ident: blockId }, true)
    assert(result.type !== 'error', `Should not have an error`)
    return result
}

export function parseNoErrorAsCustomNode(uss: string, blockId: string, expectedType?: USSType[]): Extract<UrbanStatsASTExpression, { type: 'customNode' }> {
    assert(!blockId.startsWith('undefined'), 'blockId must not start with "undefined"')
    const result = parseNoError(uss, blockId)
    return {
        type: 'customNode',
        expr: result,
        originalCode: uss,
        expectedType,
        entireLoc: emptyLocation(blockId),
    }
}

export function parseNoErrorAsExpression(uss: string, blockId: string): UrbanStatsASTExpression {
    const result = parseNoError(uss, blockId)
    assert(result.type === 'expression', `Must be expression, got ${JSON.stringify(result)}`)
    return result.value
}
