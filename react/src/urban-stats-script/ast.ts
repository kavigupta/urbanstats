import assert from 'assert'

import { HumanReadableElement } from '../utils/human-readable-element'

import { AutoUXNodeMetadata } from './autoux-node-metadata'
import { LocInfo } from './location'
import { BinaryOperatorSymbol, UnaryOperatorSymbol } from './operators'
import { Decorated, ParseError } from './parser'
import { USSType } from './types-values'

/**
 * A tree carries whatever a reader of it hangs on the nodes: reading a script for its units hangs
 * on each number what it is a number of. Nothing hangs anything by default.
 */
export type UrbanStatsASTArg<M = unknown> = (
    { type: 'unnamed', value: UrbanStatsASTExpression<M> } |
    { type: 'named', name: Decorated<string>, value: UrbanStatsASTExpression<M> }) & M

export type UrbanStatsASTLHS<M = unknown> = (
    { type: 'identifier', name: Decorated<string> } |
    { type: 'attribute', expr: UrbanStatsASTExpression<M>, name: Decorated<string> }) & M

export type UrbanStatsASTConstant = (
    { type: 'number', value: number } |
    { type: 'string', value: string } |
    { type: 'humanReadableElements', value: HumanReadableElement[] })

export type UrbanStatsASTExpression<M = unknown> = (
    UrbanStatsASTLHS<M> |
    ({ type: 'constant', value: Decorated<UrbanStatsASTConstant> } |
    { type: 'call', fn: UrbanStatsASTExpression<M>, args: UrbanStatsASTArg<M>[], entireLoc: LocInfo } |
    { type: 'binaryOperator', operator: Decorated<BinaryOperatorSymbol>, left: UrbanStatsASTExpression<M>, right: UrbanStatsASTExpression<M> } |
    { type: 'unaryOperator', operator: Decorated<UnaryOperatorSymbol>, expr: UrbanStatsASTExpression<M> } |
    { type: 'objectLiteral', entireLoc: LocInfo, properties: [string, UrbanStatsASTExpression<M>][] } |
    { type: 'vectorLiteral', entireLoc: LocInfo, elements: UrbanStatsASTExpression<M>[] } |
    { type: 'if', entireLoc: LocInfo, condition: UrbanStatsASTExpression<M>, then: UrbanStatsASTStatement<M>, else?: UrbanStatsASTStatement<M> } |
    { type: 'do', entireLoc: LocInfo, statements: UrbanStatsASTStatement<M>[] } |
    // for internal purposes only
    { type: 'customNode', entireLoc: LocInfo, expr: UrbanStatsASTStatement<M>, originalCode: string, expectedType?: USSType[] } |
    { type: 'autoUXNode', entireLoc: LocInfo, expr: UrbanStatsASTExpression<M>, metadata: AutoUXNodeMetadata }) & M
)

export type UrbanStatsASTStatement<M = unknown> = (
    { type: 'assignment', lhs: UrbanStatsASTLHS<M>, value: UrbanStatsASTExpression<M> } |
    { type: 'expression', value: UrbanStatsASTExpression<M> } |
    { type: 'statements', entireLoc: LocInfo, result: UrbanStatsASTStatement<M>[] } |
    { type: 'condition', entireLoc: LocInfo, condition: UrbanStatsASTExpression<M>, rest: UrbanStatsASTStatement<M>[] } |
    { type: 'parseError', originalCode: string, errors: ParseError[] }) & M

export type UrbanStatsAST<M = unknown> = UrbanStatsASTArg<M> | UrbanStatsASTExpression<M> | UrbanStatsASTStatement<M>

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
        case 'call':
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
        case 'autoUXNode':
        case 'customNode':
            return node.entireLoc
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
            case 'call':
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
            case 'autoUXNode':
                collectErrors(n.expr)
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
