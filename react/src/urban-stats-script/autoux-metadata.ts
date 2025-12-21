import { UrbanStatsASTExpression } from './ast'
import * as l from './literal-parser'
import { TypeEnvironment } from './types-values'

const autoUXMetadataSchema = l.object({
    collapsed: l.optional(l.boolean()),
})

export type AutoUXMetadata = l.infer<typeof autoUXMetadataSchema>

export function getAutoUXMetadata(expr: UrbanStatsASTExpression & { type: 'objectLiteral' }, typeEnvironment: TypeEnvironment): AutoUXMetadata {
    try {
        return autoUXMetadataSchema.parse(expr, typeEnvironment)
    }
    catch {
        return {
            collapsed: undefined,
        }
    }
}
