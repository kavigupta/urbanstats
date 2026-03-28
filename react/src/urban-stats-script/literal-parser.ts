/**
 * A zod-like parser to extract static values from and edit USS ASTs
 */

import { parseExpr } from '../mapper/settings/parseExpr'
import { assert } from '../utils/defensive'

import { UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { AutoUXNodeMetadata } from './autoux-node-metadata'
import { parseNumber } from './lexer'
import { noLocation } from './location'
import { unparse } from './parser'
import { TypeEnvironment, USSType } from './types-values'

export class LiteralParseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'LiteralParseError'
    }
}

function error(message: string, expr: UrbanStatsASTExpression | UrbanStatsASTStatement | undefined | UrbanStatsASTStatement[], childErrors?: Error[]): never {
    throw new LiteralParseError(`${message}: ${JSON.stringify(expr)}${childErrors && `\n${childErrors.map(e => `  ${e.message}`).join('\n')}`}`)
}

export interface LiteralExprParser<T> {
    // Undefined is a non-existent expression, used for optionals
    parse: (
        expr: UrbanStatsASTExpression | undefined,
        typeEnvironment: TypeEnvironment,
        doEdit?: (newExpr: UrbanStatsASTExpression | undefined) => UrbanStatsASTExpression | UrbanStatsASTStatement | undefined
    ) => T
}

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
                    if (e instanceof LiteralParseError) {
                        errors.push(e)
                    }
                    else {
                        throw e
                    }
                }
            }
            error(`No union schema could be parsed`, expr, errors)
        },
    }
}

export function numberWithOriginalString(): LiteralExprParser<{ value?: number, originalString: string }> {
    return {
        parse(expr, env) {
            if (expr?.type === 'unaryOperator' && expr.operator.node === '-') {
                const { value, originalString } = numberWithOriginalString().parse(expr.expr, env)
                return { value: value === undefined ? undefined : -value, originalString: `-${originalString}` }
            }
            if (expr?.type === 'constant' && expr.value.node.type === 'number') {
                return { value: expr.value.node.value, originalString: expr.value.node.value.toString() }
            }
            const toNumberSchema = call({
                fn: identifier('toNumber'),
                unnamedArgs: [string()],
                namedArgs: {},
            })
            const numberStr = toNumberSchema.parse(expr, env).unnamedArgs[0]
            const numValue = parseNumber(numberStr)
            return { value: numValue, originalString: numberStr }
        },
    }
}

export function number(): LiteralExprParser<number> {
    return {
        parse(expr, env) {
            const { value } = numberWithOriginalString().parse(expr, env)
            if (value === undefined) {
                error('not a valid number', expr)
            }
            return value
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
                        catch (err) {
                            if (err instanceof LiteralParseError) {
                                continue
                            }
                            else {
                                throw err
                            }
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
                newExpr => doEdit(newExpr === undefined ? undefined : parseExpr(newExpr, blockIdent, types, env, (e) => { throw new Error(`should not happen ${e}`) }, true)),
            )
        },
    }
}

interface LiteralStmtParser<T> {
    // Undefined is a non-existent expression, used for optionals
    parse: (
        stmt: UrbanStatsASTStatement | undefined,
        typeEnvironment: TypeEnvironment,
        doEdit?: (newStmt: UrbanStatsASTStatement) => UrbanStatsASTStatement | UrbanStatsASTExpression | undefined
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
    doEdit: (newStmt: UrbanStatsASTStatement[]) => UrbanStatsASTStatement | UrbanStatsASTExpression | undefined,
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

export function passthrough(): LiteralExprParser<UrbanStatsASTExpression | undefined> {
    return {
        parse(expr) {
            return expr
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

export function lastExpression<T>(expressionSchema: LiteralExprParser<T>): LiteralStmtParser<T> {
    return {
        parse(stmt, typeEnvironment, doEdit = e => e) {
            switch (stmt?.type) {
                case 'assignment':
                case 'expression':
                    const value = stmt.value
                    if (value.type === 'customNode') {
                        return this.parse(value.expr, typeEnvironment, newExpr => doEdit({ ...stmt, value: { ...value, expr: newExpr, originalCode: unparse(newExpr) } }))
                    }
                    return expressionSchema.parse(stmt.value, typeEnvironment, newExpr => newExpr === undefined ? undefined : doEdit({ ...stmt, value: newExpr }))
                case 'condition':
                    if (stmt.rest.length === 0) {
                        return this.parse(undefined, typeEnvironment, newStmt => doEdit({ ...stmt, rest: [newStmt] }))
                    }
                    return this.parse(stmt.rest[stmt.rest.length - 1], typeEnvironment, newStmt => doEdit({ ...stmt, rest: [...stmt.rest.slice(0, stmt.rest.length - 1), newStmt] }))
                case 'statements':
                    if (stmt.result.length === 0) {
                        return this.parse(undefined, typeEnvironment, newStmt => doEdit({ ...stmt, result: [newStmt] }))
                    }
                    return this.parse(stmt.result[stmt.result.length - 1], typeEnvironment, newStmt => doEdit({ ...stmt, result: [...stmt.result.slice(0, stmt.result.length - 1), newStmt] }))
                case 'parseError':
                    error('parse error', stmt)
                case undefined:
                    return expressionSchema.parse(undefined, typeEnvironment, newExpr => newExpr === undefined ? undefined : doEdit({ type: 'expression', value: newExpr }))
            }
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

export function maybeCustomNodeExpr<T>(schema: LiteralExprParser<T>): LiteralExprParser<T> {
    return union([
        schema,
        customNode(expression(schema)),
    ])
}

export function customNode<T>(schema: LiteralStmtParser<T>): LiteralExprParser<T> {
    return {
        parse(expr, typeEnvironment, doEdit = e => e) {
            if (expr?.type !== 'customNode') {
                error('not a customNode', expr)
            }

            return schema.parse(expr.expr, typeEnvironment, newExpr => doEdit({ ...expr, expr: newExpr, originalCode: unparse(newExpr) }))
        },
    }
}

export function maybeAutoUXNode<T>(schema: LiteralExprParser<T>): LiteralExprParser<{ expr: T, metadata: AutoUXNodeMetadata }> {
    return {
        parse(expr, env, doEdit = e => e) {
            if (expr?.type === 'autoUXNode') {
                return {
                    expr: schema.parse(expr.expr, env, (newExpr) => {
                        if (newExpr === undefined) {
                            return undefined
                        }
                        if (newExpr.type === 'autoUXNode') {
                            return doEdit(newExpr)
                        }
                        return doEdit({
                            ...expr,
                            expr: newExpr,
                        })
                    }),
                    metadata: expr.metadata,
                }
            }
            return {
                expr: schema.parse(expr, env, doEdit),
                metadata: {},
            }
        },
    }
}
