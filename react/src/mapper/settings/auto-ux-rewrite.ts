import { UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { emptyLocation } from '../../urban-stats-script/lexer'
import * as l from '../../urban-stats-script/literal-parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'

export const emptyTypeEnvironment: TypeEnvironment = new Map()

interface UnparseRewriteRule<T> {
    parser: l.LiteralExprParser<T>
    // undefined if the rule should not be applied; otherwise returns the expression to replace with
    createNew: (match: T, expr: UrbanStatsASTExpression) => UrbanStatsASTExpression | undefined
}

const autoUXToNumberRewriteRule: UnparseRewriteRule<number> = {
    parser: l.number(),
    createNew: (value) => {
        return {
            type: 'constant',
            value: { node: { type: 'number', value }, location: emptyLocation('') },
        } satisfies UrbanStatsASTExpression
    },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is used for the rewrite rule, which can have any intermediate
export type UnparseRewriteRules = UnparseRewriteRule<any>[]

export const autoUXSimplificationRewriteRules: UnparseRewriteRules = [autoUXToNumberRewriteRule]

export function applyRewriteRules(expr: UrbanStatsASTExpression): UrbanStatsASTExpression {
    let rewritten = expr
    for (const rewriteRule of autoUXSimplificationRewriteRules) {
        try {
            rewritten = rewriteRule.createNew(rewriteRule.parser.parse(rewritten, new Map()), rewritten) ?? expr
        }
        catch (err) {
            if (err instanceof l.LiteralParseError) {
                continue
            }
            else {
                throw err
            }
        }
    }
    return rewritten
}
