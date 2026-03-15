import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { emptyLocation } from '../../urban-stats-script/lexer'
import { extendBlockIdPositionalArg } from '../../urban-stats-script/location'
import { unparse } from '../../urban-stats-script/parser'
import { assert } from '../../utils/defensive'

export type Selection = { type: 'variable' | 'function', name: string } | { type: 'custom' } | { type: 'constant' } | { type: 'vector' } | { type: 'object' }

export function parseToNumber(uss: UrbanStatsASTExpression): string | undefined {
    if (uss.type === 'call'
        && uss.fn.type === 'identifier'
        && uss.fn.name.node === 'toNumber'
        && uss.args.length === 1
        && uss.args[0].type === 'unnamed') {
        const argExpr = uss.args[0].value
        if (argExpr.type === 'constant' && argExpr.value.node.type === 'string') {
            return argExpr.value.node.value
        }
    }
    return undefined
}

export function toNumberAST(value: string, blockIdent: string): UrbanStatsASTExpression {
    return {
        type: 'call',
        fn: {
            type: 'identifier',
            name: { node: 'toNumber', location: emptyLocation(extendBlockIdPositionalArg(blockIdent, 0)) },
        },
        args: [{
            type: 'unnamed',
            value: {
                type: 'constant',
                value: {
                    node: { type: 'string', value },
                    location: emptyLocation(extendBlockIdPositionalArg(blockIdent, 0)),
                },
            },
        }],
        entireLoc: emptyLocation(blockIdent),
    }
}

export function maybeClassifyExpr(uss: UrbanStatsASTExpression): Selection | undefined {
    if (parseToNumber(uss) !== undefined) {
        return { type: 'constant' }
    }
    if (uss.type === 'customNode') {
        return { type: 'custom' }
    }
    if (uss.type === 'constant') {
        return { type: 'constant' }
    }
    if (uss.type === 'identifier') {
        return { type: 'variable', name: uss.name.node }
    }
    if (uss.type === 'call') {
        const classifiedFn = classifyExpr(uss.fn)
        assert(classifiedFn.type === 'variable', 'Function must be a variable or another function')
        return { type: 'function', name: classifiedFn.name }
    }
    if (uss.type === 'vectorLiteral') {
        return { type: 'vector' }
    }
    if (uss.type === 'objectLiteral') {
        return { type: 'object' }
    }
    return undefined
}

export function classifyExpr(uss: UrbanStatsASTExpression): Selection {
    const classified = maybeClassifyExpr(uss)
    if (!classified) {
        throw new Error(`Unsupported USS expression: ${unparse(uss)}`)
    }
    return classified
}
