/**
 * A zod-like parser to extract static values from and edit USS ASTs
 */

import { parseExpr } from '../mapper/settings/parseExpr'

import { UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { noLocation } from './location'
import { TypeEnvironment, USSType } from './types-values'

interface LiteralExprParser<T> {
    // Undefined is a non-existent expression, used for optionals
    parse: (
        expr: UrbanStatsASTExpression | undefined,
        typeEnvironment: TypeEnvironment,
        doEdit?: (newExpr: UrbanStatsASTExpression) => UrbanStatsASTExpression | UrbanStatsASTStatement
    ) => T | undefined
}

export function string(): LiteralExprParser<string> {
    return {
        parse(expr) {
            if (expr?.type === 'constant' && expr.value.node.type === 'string') {
                return expr.value.node.value
            }
            return undefined
        },
    }
}

export function boolean(): LiteralExprParser<boolean> {
    return {
        parse(expr) {
            if (expr?.type === 'identifier' && ['true', 'false'].includes(expr.name.node)) {
                return expr.name.node === 'true'
            }
            return undefined
        },
    }
}

export function number(): LiteralExprParser<number> {
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

export function object<T extends Record<string, unknown>>(schema: { [K in keyof T]: LiteralExprParser<T[K]> }): LiteralExprParser<T> {
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
                return result
            }
            return undefined
        },
    }
}

export function optional<T>(schema: LiteralExprParser<T>): LiteralExprParser<T | null> {
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
    namedArgs: { [K in keyof N]: LiteralExprParser<N[K]> }
    unnamedArgs: { [I in keyof U]: LiteralExprParser<U[I]> }
}): LiteralExprParser<{ namedArgs: N, unnamedArgs: U }> {
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

export function vector<T>(schema: LiteralExprParser<T>): LiteralExprParser<T[]> {
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

export function deconstruct<T>(schema: LiteralExprParser<T>): LiteralExprParser<T> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'identifier') {
                const type = env.get(expr.name.node)
                if (type?.documentation?.equivalentExpressions !== undefined && type.documentation.equivalentExpressions.length > 0) {
                    for (const equivalentExpression of type.documentation.equivalentExpressions) {
                        const parsed = schema.parse(equivalentExpression, env, doEdit)
                        if (parsed !== undefined) {
                            return parsed
                        }
                    }
                }
            }
            return schema.parse(expr, env, doEdit)
        },
    }
}

/**
 * Enables selectively editing an AST (does a shallow copy)
 */
export function edit<T>(
    schema: LiteralExprParser<T>,
): LiteralExprParser<{
        currentValue: T
        edit: (newExpr: UrbanStatsASTExpression) => UrbanStatsASTExpression | UrbanStatsASTStatement
        expr: UrbanStatsASTExpression | undefined
    }> {
    return {
        parse(expr, env, doEdit = e => e) {
            const parsed = schema.parse(expr, env, doEdit)
            if (parsed === undefined) {
                return undefined
            }
            return {
                currentValue: parsed,
                edit: doEdit,
                expr,
            }
        },
    }
}

/**
 * Reparse the expr when editing
 */
export function reparse<T>(blockIdent: string, types: USSType[], schema: LiteralExprParser<T>): LiteralExprParser<T> {
    return {
        parse(expr, env, doEdit = e => e) {
            return schema.parse(expr, env,
                newExpr => doEdit(parseExpr(newExpr, blockIdent, types, env, () => { throw new Error('should not happen') }, true)),
            )
        },
    }
}

interface LiteralStmtParser<T> {
    // Undefined is a non-existent expression, used for optionals
    parse: (
        stmt: UrbanStatsASTStatement | undefined,
        typeEnvironment: TypeEnvironment,
        doEdit?: (newStmt: UrbanStatsASTStatement) => UrbanStatsASTStatement
    ) => T | undefined
}

export function expression<T>(schema: LiteralExprParser<T>): LiteralStmtParser<T> {
    return {
        parse(stmt, env, doEdit = e => e) {
            if (stmt?.type === 'expression') {
                const parsed = schema.parse(stmt.value, env,
                    newExpr => doEdit({ ...stmt, value: newExpr }),
                )
                if (parsed !== undefined) {
                    return parsed
                }
            }
            return
        },
    }
}

function parseStatements<T extends unknown[]>(
    schema: { [I in keyof T]: LiteralStmtParser<T[I]> },
    stmts: UrbanStatsASTStatement[],
    env: TypeEnvironment,
    doEdit: (newStmt: UrbanStatsASTStatement[]) => UrbanStatsASTStatement,
): T | undefined {
    const result = [] as unknown as T
    for (const [i, s] of schema.entries()) {
        if (i >= stmts.length) {
            return
        }
        const parsed = s.parse(stmts[i], env,
            newStmt => doEdit([...stmts.slice(i), newStmt, ...stmts.slice(i + 1)]),
        )
        if (parsed === undefined) {
            return
        }
        result[i] = parsed
    }
    return result
}

export function statements<T extends unknown[]>(schema: { [I in keyof T]: LiteralStmtParser<T[I]> }): LiteralStmtParser<T> {
    return {
        parse(stmt, env, doEdit = e => e) {
            if (stmt?.type === 'statements') {
                return parseStatements(schema, stmt.result, env,
                    newStmts => doEdit({ ...stmt, result: newStmts }),
                )
            }
            return
        },
    }
}

export function ignore(): LiteralStmtParser<null> & LiteralExprParser<null> {
    return {
        parse() {
            return null
        },
    }
}

export function condition<C, R extends unknown[]>(schema: { condition: LiteralExprParser<C>, rest: { [I in keyof R]: LiteralStmtParser<R[I]> } }): LiteralStmtParser<{ condition: C, rest: R }> {
    return {
        parse(stmt, env, doEdit = e => e) {
            if (stmt?.type === 'condition') {
                const cond = schema.condition.parse(stmt.condition, env,
                    newExpr => doEdit({ ...stmt, condition: newExpr }),
                )
                if (cond === undefined) {
                    return
                }
                const rest = parseStatements(schema.rest, stmt.rest, env,
                    newStmts => doEdit({ ...stmt, rest: newStmts }),
                )
                if (rest === undefined) {
                    return
                }
                return { condition: cond, rest }
            }
            return
        },
    }
}
export function transformExpr<T, U>(schema: LiteralExprParser<T>, map: (t: T) => U): LiteralExprParser<U> {
    return {
        parse(ast, env, doEdit = e => e) {
            const parsed = schema.parse(ast, env, doEdit)
            if (parsed !== undefined) {
                return map(parsed)
            }
            return
        },
    }
}

export function transformStmt<T, U>(schema: LiteralStmtParser<T>, map: (t: T) => U): LiteralStmtParser<U> {
    return {
        parse(ast, env, doEdit = e => e) {
            const parsed = schema.parse(ast, env, doEdit)
            if (parsed !== undefined) {
                return map(parsed)
            }
            return
        },
    }
}
