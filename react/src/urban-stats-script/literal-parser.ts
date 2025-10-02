/**
 * A zod-like parser to extract static values from and edit USS ASTs
 */

import { UrbanStatsASTExpression } from './ast'
import { noLocation } from './location'
import { TypeEnvironment } from './types-values'

interface LiteralParser<T> {
    // Undefined is a non-existent expression, used for optionals
    parse: (
        expr: UrbanStatsASTExpression | undefined,
        typeEnvironment: TypeEnvironment,
        doEdit?: (newExpr: UrbanStatsASTExpression) => UrbanStatsASTExpression
    ) => T | undefined
}

export function string(): LiteralParser<string> {
    return {
        parse(expr) {
            if (expr?.type === 'constant' && expr.value.node.type === 'string') {
                return expr.value.node.value
            }
            return undefined
        },
    }
}

export function boolean(): LiteralParser<boolean> {
    return {
        parse(expr) {
            if (expr?.type === 'identifier' && ['true', 'false'].includes(expr.name.node)) {
                return expr.name.node === 'true'
            }
            return undefined
        },
    }
}

export function number(): LiteralParser<number> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'unaryOperator' && expr.operator.node === '-') {
                const inverse = this.parse(expr.expr, env, newExpr => doEdit({ ...expr, expr: newExpr }))
                if (inverse === undefined) {
                    return undefined
                }
                return -inverse
            }
            if (expr?.type === 'constant' && expr.value.node.type === 'number') {
                return expr.value.node.value
            }
            return undefined
        },
    }
}

export function object<T extends Record<string, unknown>>(schema: { [K in keyof T]: LiteralParser<T[K]> }): LiteralParser<T> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'objectLiteral') {
                const result = {} as T
                for (const key of Object.keys(schema)) {
                    const match = expr.properties.find(([k]) => k === key)
                    const parsed = schema[key].parse(
                        match?.[1], env,
                        newExpr => doEdit({ ...expr, properties: match
                            ? expr.properties.map(prop => prop === match ? [prop[0], newExpr] : prop)
                            : [...expr.properties, [key as string, newExpr]] }))
                    if (parsed === undefined) {
                        return
                    }
                    result[key] = parsed
                }
            }
            return undefined
        },
    }
}

export function optional<T>(schema: LiteralParser<T>): LiteralParser<T | null> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr === undefined) {
                return null
            }
            return schema.parse(expr, env, doEdit)
        },
    }
}

export function call<N extends Record<string, unknown>, U extends unknown[]>(schema: {
    namedArgs: { [K in keyof N]: LiteralParser<N[K]> }
    unnamedArgs: { [I in keyof U]: LiteralParser<U[I]> }
}): LiteralParser<{ namedArgs: N, unnamedArgs: U }> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'call') {
                const namedResult = {} as N
                for (const key of Object.keys(schema.namedArgs)) {
                    const match = expr.args.find(arg => arg.type === 'named' && arg.name.node === key)
                    const parsed = schema.namedArgs[key].parse(match?.value, env,
                        newExpr => doEdit({ ...expr, args: match
                            ? expr.args.map(prop => prop === match ? { ...prop, value: newExpr } : prop)
                            : [...expr.args, { type: 'named', name: { node: key as string, location: noLocation }, value: newExpr }] }),
                    )
                    if (parsed === undefined) {
                        return
                    }
                    namedResult[key] = parsed
                }

                const unnamedResult = [] as unknown as U
                argSchemas: for (const [i, argSchema] of schema.unnamedArgs.entries()) {
                    let j = 0
                    for (const arg of expr.args) {
                        if (arg.type === 'named') {
                            continue
                        }
                        if (j === i) {
                            const parsed = argSchema.parse(arg.value, env,
                                newExpr => doEdit({ ...expr, args: expr.args.map(a => a === arg ? { ...a, value: newExpr } : a) }),
                            )
                            if (parsed === undefined) {
                                return
                            }
                            unnamedResult[i] = parsed
                            continue argSchemas
                        }
                        j++
                    }
                    return // not found
                }

                return { namedArgs: namedResult, unnamedArgs: unnamedResult }
            }
            return
        },
    }
}

export function vector<T>(schema: LiteralParser<T>): LiteralParser<T[]> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'vectorLiteral') {
                const result: T[] = []
                for (const elem of expr.elements) {
                    const parsed = schema.parse(elem, env,
                        newExpr => doEdit({ ...expr, elements: expr.elements.map(e => e === elem ? newExpr : e) }),
                    )
                    if (parsed === undefined) {
                        return
                    }
                    result.push(parsed)
                }
                return result
            }
            return
        },
    }
}

export function deconstruct<T>(schema: LiteralParser<T>): LiteralParser<T> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'identifier') {
                const type = env.get(expr.name.node)
                if (type === undefined) {
                    return
                }
                if (type.documentation?.equivalentExpressions === undefined || type.documentation.equivalentExpressions.length === 0) {
                    return
                }
                for (const equivalentExpression of type.documentation.equivalentExpressions) {
                    const parsed = schema.parse(equivalentExpression, env, doEdit)
                    if (parsed !== undefined) {
                        return parsed
                    }
                }
            }
            return
        },
    }
}

/**
 * Enables selectively editing an AST (does a shallow copy)
 *
 * Example usage:
 *
 * edit(selector => object({ a: number(), b: selector(number()) })).parse({ a: 1, b: 2 }).b.edit(3) // { a: 1, b: 3 }
 */
export function edit<T>(
    schema: (selector: <U>(selectorSchema: LiteralParser<U>) => LiteralParser<{ currentValue: U, edit: (newExpr: UrbanStatsASTExpression) => UrbanStatsASTExpression }>) => LiteralParser<T>,
): LiteralParser<T> {
    return {
        parse(expr, env, doEdit = e => e) {
            return schema(selectorSchema => ({
                parse(selectorExpr, selectorEnv, doSelectorEdit) {
                    const parsed = selectorSchema.parse(selectorExpr, selectorEnv)
                    if (parsed === undefined) {
                        return
                    }
                    return {
                        currentValue: parsed,
                        edit: doSelectorEdit!,
                    }
                },
            })).parse(expr, env, doEdit)
        },
    }
}
