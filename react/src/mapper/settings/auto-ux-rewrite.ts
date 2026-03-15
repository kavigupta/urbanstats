import { UrbanStatsASTExpression, UrbanStatsASTStatement } from '../../urban-stats-script/ast'
import { emptyLocation } from '../../urban-stats-script/lexer'
import * as l from '../../urban-stats-script/literal-parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'

const emptyTypeEnvironment: TypeEnvironment = new Map()

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
type UnparseRewriteRules = UnparseRewriteRule<any>[]

const autoUXSimplificationRewriteRules: UnparseRewriteRules = [autoUXToNumberRewriteRule]

function isExpressionNode(n: UrbanStatsASTStatement | UrbanStatsASTExpression): n is UrbanStatsASTExpression {
    switch (n.type) {
        case 'assignment':
        case 'expression':
        case 'statements':
        case 'if':
        case 'do':
        case 'condition':
            return false
        default:
            return true
    }
}

export function applyRewriteRules(expr: UrbanStatsASTExpression | UrbanStatsASTStatement): UrbanStatsASTExpression | UrbanStatsASTStatement {
    if (!isExpressionNode(expr)) {
        return expr
    }
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
