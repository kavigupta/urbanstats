import { UrbanStatsASTExpression } from './ast'
import { noLocation } from './lexer'

export function createConstantExpression(value: number | string | boolean | null): UrbanStatsASTExpression {
    // Create a simple constant expression for primitive values
    if (typeof value === 'number') {
        return {
            type: 'constant',
            value: { node: { type: 'number', value }, location: noLocation },
        }
    }
    else if (typeof value === 'string') {
        return {
            type: 'constant',
            value: { node: { type: 'string', value }, location: noLocation },
        }
    }
    else if (typeof value === 'boolean') {
        // For booleans, use identifier expressions that reference the predefined constants
        return {
            type: 'identifier',
            name: { node: value.toString(), location: noLocation },
        }
    }
    else {
        // For null, use identifier expression that references the predefined null constant
        return {
            type: 'identifier',
            name: { node: 'null', location: noLocation },
        }
    }
}
