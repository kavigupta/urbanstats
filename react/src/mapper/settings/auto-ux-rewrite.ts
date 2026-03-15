import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { parseNumber, emptyLocation } from '../../urban-stats-script/lexer'
import * as l from '../../urban-stats-script/literal-parser'
import { UnparseRewriteRule } from '../../urban-stats-script/parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'

export const emptyTypeEnvironment: TypeEnvironment = new Map()

export const toNumberSchema = l.call({
    fn: l.identifier('toNumber'),
    unnamedArgs: [l.string()] as [ReturnType<typeof l.string>],
    namedArgs: {},
})

export const autoUXToNumberRewriteRule: UnparseRewriteRule<ReturnType<typeof toNumberSchema.parse>> = {
    parser: toNumberSchema,
    method: ({ unnamedArgs: [value] }) => {
        const numValue = parseNumber(value)
        if (numValue === undefined) {
            return undefined
        }
        return {
            type: 'constant',
            value: { node: { type: 'number', value: numValue }, location: emptyLocation('') },
        } satisfies UrbanStatsASTExpression
    },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is used for the rewrite rule, which can have any intermediate
export const autoUXSimplificationRewriteRules: UnparseRewriteRule<any>[] = [autoUXToNumberRewriteRule]

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
export function applyRewriteRules(rewriteRules: UnparseRewriteRule<any>[], expr: UrbanStatsASTExpression): UrbanStatsASTExpression {
    let rewritten = expr
    for (const rewriteRule of rewriteRules) {
        rewritten = rewriteRule.method(rewriteRule.parser.parse(rewritten, new Map()), rewritten) ?? expr
    }
    return rewritten
}
