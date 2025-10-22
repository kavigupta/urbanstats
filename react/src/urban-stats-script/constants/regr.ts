import { calculateRegression, computePearsonR2 } from '../../mapper/regression'
import { assert } from '../../utils/defensive'
import { UrbanStatsASTExpression } from '../ast'
import { Context } from '../context'
import { USSFunctionArgType, USSRawValue, USSType, USSValue, createConstantExpression } from '../types-values'

export function regressionResultType(numRegressionDependentsMax: number): USSType {
    return {
        type: 'object',
        properties: new Map<string, USSType>([
            ['residuals', { type: 'vector', elementType: { type: 'number' } }] satisfies [string, USSType],
            ...Array.from({ length: numRegressionDependentsMax }, (_, i: number) => [`m${i + 1}`, { type: 'number' }] satisfies [string, USSType]),
            ['b', { type: 'number' }],
            ['r2', { type: 'number' }],
        ]),
    }
}

export function regressionType(numRegressionDependentsMax: number): USSType {
    const requiredVariableType = { type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } } } satisfies { type: USSFunctionArgType, defaultValue?: UrbanStatsASTExpression }
    const optionalVariableType = { ...requiredVariableType, defaultValue: createConstantExpression(null) } satisfies { type: USSFunctionArgType, defaultValue?: UrbanStatsASTExpression }
    return {
        type: 'function',
        posArgs: [],
        namedArgs: {
            y: requiredVariableType,
            x1: requiredVariableType,
            ...Array.from({ length: numRegressionDependentsMax - 1 },
                (_, i) => [`x${i + 2}`, optionalVariableType] satisfies [string, { type: USSFunctionArgType, defaultValue?: UrbanStatsASTExpression } ],
            ).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
            weight: optionalVariableType,
            noIntercept: { type: { type: 'concrete', value: { type: 'boolean' } }, defaultValue: createConstantExpression(false) } satisfies { type: USSFunctionArgType, defaultValue?: UrbanStatsASTExpression },
        },
        returnType: { type: 'concrete', value: regressionResultType(numRegressionDependentsMax) },
    }
}

export function regression(numRegressionDependentsMax: number): USSValue {
    return {
        type: regressionType(numRegressionDependentsMax),
        value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>): USSRawValue => {
            assert(posArgs.length === 0, `Expected no positional arguments for regression, got ${posArgs.length}`)
            const dependent = namedArgs.y as number[]
            const independents = []
            const indices = []
            for (let i = 1; i <= numRegressionDependentsMax; i++) {
                const independent = namedArgs[`x${i}`] as number[] | null
                if (independent !== null) {
                    independents.push(independent)
                    indices.push(i)
                }
            }
            const w = namedArgs.weight as number[] | null

            const { residuals, weights, intercept } = calculateRegression(
                dependent,
                independents,
                w ?? undefined,
                namedArgs.noIntercept as boolean,
            )
            assert(weights.length === indices.length, `Expected ${indices.length} weights, got ${weights.length}`)

            const result = new Map<string, USSRawValue>()
            for (let i = 0; i < indices.length; i++) {
                result.set(`m${indices[i]}`, weights[i])
            }
            for (let i = 0; i < numRegressionDependentsMax; i++) {
                if (!result.has(`m${i + 1}`)) {
                    result.set(`m${i + 1}`, NaN)
                }
            }
            result.set('r2', computePearsonR2(dependent, residuals, w ?? undefined))
            result.set('residuals', residuals)
            result.set('b', intercept)

            return result
        },
        documentation: {
            humanReadableName: `Linear Regression`,
            category: 'regression',
            longDescription: `Performs linear regression analysis with up to ${numRegressionDependentsMax} independent variables. Returns coefficients, residuals, R-squared value, and intercept. Supports weighted regression and optional intercept removal.`,
            selectorRendering: { kind: 'subtitleLongDescription' },
        },
    }
}
