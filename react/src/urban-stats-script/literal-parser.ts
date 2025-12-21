/**
 * A zod-like parser to extract static values from and edit USS ASTs
 */

import { parseExpr } from '../mapper/settings/parseExpr'
import { assert } from '../utils/defensive'

import { UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { noLocation } from './location'
import { unparse } from './parser'
import { TypeEnvironment, USSType } from './types-values'

function error(message: string, expr: UrbanStatsASTExpression | UrbanStatsASTStatement | undefined | UrbanStatsASTStatement[], childErrors?: Error[]): never {
    throw new Error(`${message}: ${JSON.stringify(expr)}${childErrors && `\n${childErrors.map(e => `  ${e.message}`).join('\n')}`}`)
}

interface LiteralExprParser<T> {
    // Undefined is a non-existent expression, used for optionals
    parse: (
        expr: UrbanStatsASTExpression | undefined,
        typeEnvironment: TypeEnvironment,
        doEdit?: (newExpr: UrbanStatsASTExpression | undefined) => UrbanStatsASTExpression | UrbanStatsASTStatement | undefined
    ) => T
}

export type infer<P extends LiteralExprParser<unknown>> = P extends LiteralExprParser<infer T> ? T : never

export function string(): LiteralExprParser<string> {
    return {
        parse(expr) {
            if (expr?.type === 'constant' && expr.value.node.type === 'string') {
                return expr.value.node.value
            }
            error(`not a string constant`, expr)
        },
    }
}

export function boolean(): LiteralExprParser<boolean> {
    return transformExpr(union([identifier('true'), identifier('false')]), i => i === 'true')
}

export function identifier<T extends string>(name: T): LiteralExprParser<T> {
    return {
        parse(expr) {
            if (expr?.type === 'identifier' && expr.name.node === name) {
                return name
            }
            error(`not an identifier with the name ${name}`, expr)
        },
    }
}

export function union<T>(schemas: LiteralExprParser<T>[]): LiteralExprParser<T> {
    return {
        parse(expr, env, doEdit) {
            const errors: Error[] = []
            for (const schema of schemas) {
                try {
                    return schema.parse(expr, env, doEdit)
                }
                catch (e) {
                    errors.push(e as Error)
                }
            }
            error(`No union schema could be parsed`, expr, errors)
        },
    }
}

export function number(): LiteralExprParser<number> {
    return {
        parse(expr, env) {
            if (expr?.type === 'unaryOperator' && expr.operator.node === '-') {
                return -this.parse(expr.expr, env)
            }
            if (expr?.type === 'constant' && expr.value.node.type === 'number') {
                return expr.value.node.value
            }
            error('not a number', expr)
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
                    result[key] = schema[key].parse(
                        match?.[1], env,
                        newExpr => doEdit({ ...expr, properties: newExpr === undefined
                            ? expr.properties.filter(prop => prop[0] !== key)
                            : match
                                ? expr.properties.map(prop => prop === match ? [prop[0], newExpr] : prop)
                                : [...expr.properties, [key as string, newExpr]] }))
                }
                return result
            }
            error('not an object literal', expr)
        },
    }
}

export function optional<T>(schema: LiteralExprParser<T>): LiteralExprParser<T | undefined> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr === undefined) {
                return undefined
            }
            return schema.parse(expr, env, doEdit)
        },
    }
}

export function call<N extends Record<string, unknown>, U extends unknown[], F>(schema: {
    namedArgs: { [K in keyof N]: LiteralExprParser<N[K]> }
    unnamedArgs: { [I in keyof U]: LiteralExprParser<U[I]> }
    fn: LiteralExprParser<F>
}): LiteralExprParser<{ namedArgs: N, unnamedArgs: U, fn: F }> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'call') {
                const fn = schema.fn.parse(expr.fn, env,
                    (newExpr) => {
                        assert(newExpr !== undefined, 'cannot remove just the callee')
                        return doEdit({ ...expr, fn: newExpr })
                    },
                )
                const namedResult = {} as N
                for (const key of Object.keys(schema.namedArgs)) {
                    const match = expr.args.find(arg => arg.type === 'named' && arg.name.node === key)
                    namedResult[key] = schema.namedArgs[key].parse(match?.value, env,
                        newExpr => doEdit({ ...expr, args: match
                            ? newExpr === undefined ? expr.args.filter(prop => prop !== match) : expr.args.map(prop => prop === match ? { ...prop, value: newExpr } : prop)
                            : newExpr === undefined ? expr.args : [...expr.args, { type: 'named', name: { node: key as string, location: noLocation }, value: newExpr }] }),
                    )
                }

                const unnamedResult = [] as unknown as U
                argSchemas: for (const [i, argSchema] of schema.unnamedArgs.entries()) {
                    let j = 0
                    for (const arg of expr.args) {
                        if (arg.type === 'named') {
                            continue
                        }
                        if (j === i) {
                            unnamedResult[i] = argSchema.parse(arg.value, env,
                                newExpr => doEdit({ ...expr, args: newExpr === undefined ? expr.args.filter(a => a !== arg) : expr.args.map(a => a === arg ? { ...a, value: newExpr } : a) }),
                            )
                            continue argSchemas
                        }
                        j++
                    }
                    error('not enough named args', expr)
                }

                return { namedArgs: namedResult, unnamedArgs: unnamedResult, fn }
            }
            error('not a call expression', expr)
        },
    }
}

export function vector<T>(schema: LiteralExprParser<T>): LiteralExprParser<T[]> {
    return {
        parse(expr, env, doEdit = e => e) {
            return editableVector(schema).parse(expr, env, doEdit).currentValue
        },
    }
}

export function editableVector<T>(schema: LiteralExprParser<T>): LiteralExprParser<{
    currentValue: T[]
    edit: (edits: (oldAst: UrbanStatsASTExpression[]) => UrbanStatsASTExpression[]) => UrbanStatsASTExpression | UrbanStatsASTStatement
}> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'vectorLiteral') {
                return {
                    currentValue: expr.elements.map(elem => schema.parse(elem, env,
                        newExpr => doEdit({ ...expr, elements: newExpr === undefined ? expr.elements.filter(e => e !== elem) : expr.elements.map(e => e === elem ? newExpr : e) }),
                    )),
                    edit(edits) {
                        return doEdit({
                            ...expr,
                            elements: edits(expr.elements),
                        })!
                    },
                }
            }
            error('not a vector literal', expr)
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
                        try {
                            return schema.parse(equivalentExpression, env, doEdit)
                        }
                        catch {}
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
        edit: (newExpr: UrbanStatsASTExpression | undefined) => UrbanStatsASTExpression | UrbanStatsASTStatement | undefined
        expr: UrbanStatsASTExpression | undefined
    }> {
    return {
        parse(expr, env, doEdit = e => e) {
            return {
                currentValue: schema.parse(expr, env, doEdit),
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
                newExpr => doEdit(newExpr === undefined ? undefined : parseExpr(newExpr, blockIdent, types, env, () => { throw new Error('should not happen') }, true)),
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
    ) => T
}

export function expression<T>(schema: LiteralExprParser<T>): LiteralStmtParser<T> {
    return {
        parse(stmt, env, doEdit = e => e) {
            if (stmt?.type === 'expression') {
                return schema.parse(stmt.value, env,
                    newExpr => newExpr === undefined ? undefined : doEdit({ ...stmt, value: newExpr }),
                )
            }
            error('not an expression', stmt)
        },
    }
}

function parseStatements<T extends unknown[]>(
    schema: { [I in keyof T]: LiteralStmtParser<T[I]> },
    stmts: UrbanStatsASTStatement[],
    env: TypeEnvironment,
    doEdit: (newStmt: UrbanStatsASTStatement[]) => UrbanStatsASTStatement,
): T {
    const result = [] as unknown as T
    for (const [i, s] of schema.entries()) {
        if (i >= stmts.length) {
            error('not enough statements', stmts)
        }
        result[i] = s.parse(stmts[i], env,
            newStmt => doEdit([...stmts.slice(0, i), newStmt, ...stmts.slice(i + 1)]),
        )
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
            error('not a statements list', stmt)
        },
    }
}

export function ignore(): LiteralStmtParser<undefined> & LiteralExprParser<undefined> {
    return {
        parse() {
            return undefined
        },
    }
}

export function condition<C, R extends unknown[]>(schema: { condition: LiteralExprParser<C>, rest: { [I in keyof R]: LiteralStmtParser<R[I]> } }): LiteralStmtParser<{ condition: C, rest: R }> {
    return {
        parse(stmt, env, doEdit = e => e) {
            if (stmt?.type === 'condition') {
                return {
                    condition: schema.condition.parse(stmt.condition, env,
                        (newExpr) => {
                            assert(newExpr !== undefined, 'cannot remove just the condition from a condition statement')
                            return doEdit({ ...stmt, condition: newExpr })
                        },
                    ),
                    rest: parseStatements(schema.rest, stmt.rest, env,
                        newStmts => doEdit({ ...stmt, rest: newStmts }),
                    ),
                }
            }
            error('not a condition', stmt)
        },
    }
}
export function transformExpr<T, U>(schema: LiteralExprParser<T>, map: (t: T) => U): LiteralExprParser<U> {
    return {
        parse(ast, env, doEdit = e => e) {
            return map(schema.parse(ast, env, doEdit))
        },
    }
}

export function transformStmt<T, U>(schema: LiteralStmtParser<T>, map: (t: T) => U): LiteralStmtParser<U> {
    return {
        parse(ast, env, doEdit = e => e) {
            return map(schema.parse(ast, env, doEdit))
        },
    }
}

export function customNodeExpr<T>(schema: LiteralExprParser<T>): LiteralExprParser<T> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'customNode' && expr.expr.type === 'expression') {
                const expressionStatement = expr.expr
                return schema.parse(expr.expr.value, env, newExpr => newExpr === undefined
                    ? undefined
                    : doEdit({
                        ...expr,
                        expr: {
                            ...expressionStatement,
                            value: newExpr,
                        },
                        originalCode: unparse(newExpr),
                    }))
            }
            return schema.parse(expr, env, doEdit)
        },
    }
}

export function autoUXExpr<T>(schema: LiteralExprParser<T>): LiteralExprParser<T> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'autoUX') {
                return schema.parse(expr.expr, env, newExpr => newExpr === undefined
                    ? undefined
                    : doEdit({
                        ...expr,
                        expr: newExpr,
                    }))
            }
            return schema.parse(expr, env, doEdit)
        },
    }
}
