import assert from 'assert'

import { LocInfo } from './lexer'
import { Decorated } from './parser'

export type UrbanStatsASTArg = (
    { type: 'unnamed', value: UrbanStatsASTExpression } |
    { type: 'named', name: Decorated<string>, value: UrbanStatsASTExpression })

export type UrbanStatsASTLHS = (
    { type: 'identifier', name: Decorated<string> } |
    { type: 'attribute', expr: UrbanStatsASTExpression, name: Decorated<string> })

export type UrbanStatsASTExpression = (
    UrbanStatsASTLHS |
    { type: 'constant', value: Decorated<number | string> } |
    { type: 'function', fn: UrbanStatsASTExpression, args: UrbanStatsASTArg[], entireLoc: LocInfo } |
    { type: 'binaryOperator', operator: Decorated<string>, left: UrbanStatsASTExpression, right: UrbanStatsASTExpression } |
    { type: 'unaryOperator', operator: Decorated<string>, expr: UrbanStatsASTExpression } |
    { type: 'objectLiteral', entireLoc: LocInfo, properties: [string, UrbanStatsASTExpression][] } |
    { type: 'vectorLiteral', entireLoc: LocInfo, elements: UrbanStatsASTExpression[] } |
    { type: 'if', entireLoc: LocInfo, condition: UrbanStatsASTExpression, then: UrbanStatsASTStatement, else?: UrbanStatsASTStatement }) |
    // for internal purposes only
    { type: 'customNode', expr: UrbanStatsASTStatement, originalCode: string }

export type UrbanStatsASTStatement = (
    { type: 'assignment', lhs: UrbanStatsASTLHS, value: UrbanStatsASTExpression } |
    { type: 'expression', value: UrbanStatsASTExpression } |
    { type: 'statements', entireLoc: LocInfo, result: UrbanStatsASTStatement[] } |
    { type: 'condition', entireLoc: LocInfo, condition: UrbanStatsASTExpression, rest: UrbanStatsASTStatement[] })

export type UrbanStatsAST = UrbanStatsASTArg | UrbanStatsASTExpression | UrbanStatsASTStatement

export function unify(...locations: LocInfo[]): LocInfo {
    assert(locations.length > 0, 'At least one location must be provided for unification')
    const startLine = locations.reduce((min, loc) => Math.min(min, loc.start.lineIdx), Number.MAX_VALUE)
    const endLine = locations.reduce((max, loc) => Math.max(max, loc.end.lineIdx), -Number.MAX_VALUE)
    const startCol = locations.reduce((min, loc) => Math.min(min, loc.start.colIdx), Number.MAX_VALUE)
    const endCol = locations.reduce((max, loc) => Math.max(max, loc.end.colIdx), -Number.MAX_VALUE)
    return {
        start: { block: locations[0].start.block, lineIdx: startLine, colIdx: startCol },
        end: { block: locations[0].end.block, lineIdx: endLine, colIdx: endCol },
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
        case 'condition':
            return node.entireLoc
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
        default:
            return locationOf(node)
    }
}
