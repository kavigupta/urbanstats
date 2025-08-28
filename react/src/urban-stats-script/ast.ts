import assert from 'assert'

import { LocInfo } from './lexer'
import { Decorated, ParseError } from './parser'
import { USSType } from './types-values'

export type UrbanStatsASTArg = (
    { type: 'unnamed', value: UrbanStatsASTExpression } |
    { type: 'named', name: Decorated<string>, value: UrbanStatsASTExpression })

export type UrbanStatsASTLHS = (
    { type: 'identifier', name: Decorated<string> } |
    { type: 'attribute', expr: UrbanStatsASTExpression, name: Decorated<string> })

export type UrbanStatsASTExpression = (
    UrbanStatsASTLHS |
    { type: 'constant', value: Decorated<{ type: 'number', value: number } | { type: 'string', value: string }> } |
    { type: 'function', fn: UrbanStatsASTExpression, args: UrbanStatsASTArg[], entireLoc: LocInfo } |
    { type: 'binaryOperator', operator: Decorated<string>, left: UrbanStatsASTExpression, right: UrbanStatsASTExpression } |
    { type: 'unaryOperator', operator: Decorated<string>, expr: UrbanStatsASTExpression } |
    { type: 'objectLiteral', entireLoc: LocInfo, properties: [string, UrbanStatsASTExpression][] } |
    { type: 'vectorLiteral', entireLoc: LocInfo, elements: UrbanStatsASTExpression[] } |
    { type: 'if', entireLoc: LocInfo, condition: UrbanStatsASTExpression, then: UrbanStatsASTStatement, else?: UrbanStatsASTStatement } |
    { type: 'do', entireLoc: LocInfo, statements: UrbanStatsASTStatement[] } |
    // for internal purposes only
    { type: 'customNode', expr: UrbanStatsASTStatement, originalCode: string, expectedType?: USSType[] }
)

export type UrbanStatsASTStatement = (
    { type: 'assignment', lhs: UrbanStatsASTLHS, value: UrbanStatsASTExpression } |
    { type: 'expression', value: UrbanStatsASTExpression } |
    { type: 'statements', entireLoc: LocInfo, result: UrbanStatsASTStatement[] } |
    { type: 'condition', entireLoc: LocInfo, condition: UrbanStatsASTExpression, rest: UrbanStatsASTStatement[] } |
    { type: 'parseError', originalCode: string, errors: ParseError[] })

export type UrbanStatsAST = UrbanStatsASTArg | UrbanStatsASTExpression | UrbanStatsASTStatement

export function unify(...locations: LocInfo[]): LocInfo {
    assert(locations.length > 0, 'At least one location must be provided for unification')
    const startLine = locations.reduce((min, loc) => Math.min(min, loc.start.lineIdx), Number.MAX_VALUE)
    const endLine = locations.reduce((max, loc) => Math.max(max, loc.end.lineIdx), -Number.MAX_VALUE)
    const startCol = locations.reduce((min, loc) => Math.min(min, loc.start.colIdx), Number.MAX_VALUE)
    const endCol = locations.reduce((max, loc) => Math.max(max, loc.end.colIdx), -Number.MAX_VALUE)
    const startChar = locations.reduce((min, loc) => Math.min(min, loc.start.charIdx), Number.MAX_VALUE)
    const endChar = locations.reduce((max, loc) => Math.max(max, loc.end.charIdx), -Number.MAX_VALUE)
    return {
        start: { block: locations[0].start.block, lineIdx: startLine, colIdx: startCol, charIdx: startChar },
        end: { block: locations[0].end.block, lineIdx: endLine, colIdx: endCol, charIdx: endChar },
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
        case 'vectorLiteral':
        case 'if':
        case 'do':
        case 'condition':
        case 'statements':
            return node.entireLoc
        case 'assignment':
            return unify(locationOf(node.lhs), locationOf(node.value))
        case 'expression':
            return locationOf(node.value)
        case 'parseError':
            assert(node.errors.length > 0, 'parseError node must have at least one error')
            return node.errors[0].location
        case 'customNode':
            return locationOf(node.expr)
    }
    /* c8 ignore stop */
}

export function locationOfLastExpression(node: UrbanStatsAST): LocInfo {
    switch (node.type) {
        case 'assignment':
            return locationOf(node.value)
        case 'statements':
            return locationOfLastExpression(node.result[node.result.length - 1])
        case 'parseError':
            assert(node.errors.length > 0, 'parseError node must have at least one error')
            return node.errors[0].location
        default:
            return locationOf(node)
    }
}

export function getAllParseErrors(node: UrbanStatsAST): ParseError[] {
    const errors: ParseError[] = []

    function collectErrors(n: UrbanStatsAST): void {
        switch (n.type) {
            case 'unnamed':
                collectErrors(n.value)
                break
            case 'named':
                collectErrors(n.value)
                break
            case 'constant':
            case 'identifier':
                // No parse errors in these
                break
            case 'attribute':
                collectErrors(n.expr)
                break
            case 'function':
                collectErrors(n.fn)
                n.args.forEach(collectErrors)
                break
            case 'unaryOperator':
                collectErrors(n.expr)
                break
            case 'binaryOperator':
                collectErrors(n.left)
                collectErrors(n.right)
                break
            case 'objectLiteral':
                n.properties.forEach(([, value]) => {
                    collectErrors(value)
                })
                break
            case 'vectorLiteral':
                n.elements.forEach(collectErrors)
                break
            case 'if':
                collectErrors(n.condition)
                collectErrors(n.then)
                if (n.else) {
                    collectErrors(n.else)
                }
                break
            case 'do':
                n.statements.forEach(collectErrors)
                break
            case 'assignment':
                collectErrors(n.lhs)
                collectErrors(n.value)
                break
            case 'expression':
                collectErrors(n.value)
                break
            case 'statements':
                n.result.forEach(collectErrors)
                break
            case 'condition':
                collectErrors(n.condition)
                n.rest.forEach(collectErrors)
                break
            case 'parseError':
                errors.push(...n.errors)
                break
            case 'customNode':
                collectErrors(n.expr)
                break
        }
    }

    collectErrors(node)
    return errors
}

export function toStatement(node: UrbanStatsASTExpression | UrbanStatsASTStatement): UrbanStatsASTStatement {
    switch (node.type) {
        case 'statements':
        case 'assignment':
        case 'expression':
        case 'condition':
        case 'parseError':
            return node
        default:
            return { type: 'expression', value: node }
    }
}
