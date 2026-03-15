import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import * as l from '../../urban-stats-script/literal-parser'
import { parseNoErrorAsExpression, unparse } from '../../urban-stats-script/parser'
import { assert } from '../../utils/defensive'

import { emptyTypeEnvironment, toNumberSchema } from './auto-ux-rewrite'

export type Selection = { type: 'variable' | 'function', name: string } | { type: 'custom' } | { type: 'constant' } | { type: 'vector' } | { type: 'object' }

export function parseToNumber(uss: UrbanStatsASTExpression): string | undefined {
    try {
        return toNumberSchema.parse(uss, emptyTypeEnvironment).unnamedArgs[0]
    }
    catch (err) {
        if (err instanceof l.LiteralParseError) {
            return undefined
        }
        else {
            throw err
        }
    }
}

export function toNumberAST(value: string, blockIdent: string): UrbanStatsASTExpression {
    return parseNoErrorAsExpression(`toNumber(${JSON.stringify(value)})`, blockIdent)
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
