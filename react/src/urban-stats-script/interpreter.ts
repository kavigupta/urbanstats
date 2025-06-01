import { broadcastApply, broadcastCall } from './forward-broadcasting'
import { infixOperatorMap, LocInfo } from './lexer'
import { locationOfExpr, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTLHS, UrbanStatsASTStatement } from './parser'
import { splitMask } from './split-broadcasting'
import { renderType, USSRawValue, USSValue, ValueArg } from './types-values'

export type Effect = undefined

export class InterpretationError extends Error {
    constructor(message: string, public location: LocInfo) {
        super(message)
        this.name = 'InterpretationError'
        this.location = location
    }
}

export interface Context {
    effect: (eff: Effect) => void
    error: (msg: string, location: LocInfo) => InterpretationError
    variables: Map<string, USSValue>
}

export function evaluate(expr: UrbanStatsASTExpression, env: Context): USSValue {
    switch (expr.type) {
        case 'constant':
            const value = expr.value.node
            if (typeof value === 'number') {
                return {
                    type: {
                        type: 'number',
                    },
                    value,
                }
            }
            return {
                type: {
                    type: 'string',
                },
                value: value satisfies string,
            }
        case 'identifier':
            const varName = expr.name.node
            const res = env.variables.get(varName)
            if (res !== undefined) {
                return res
            }
            throw env.error(`Undefined variable: ${varName}`, expr.name.location)
        case 'attribute':
            const obj = evaluate(expr.expr, env)
            const attr = expr.name.node
            const lookupResult = attrLookup(obj, attr)
            if (lookupResult.type === 'error') {
                throw env.error(`Attribute ${attr} not found in object of type ${renderType(obj.type)}`, locationOfExpr(expr))
            }
            return lookupResult.value
        case 'function':
            const func = evaluate(expr.fn, env)
            const args = expr.args.map(arg => evaluateArg(arg, env))
            const broadcastResult = broadcastCall(func, args, env)
            if (broadcastResult.type === 'error') {
                throw env.error(broadcastResult.message, locationOfExpr(expr))
            }
            return broadcastResult.result
        case 'binaryOperator':
            const left = evaluate(expr.left, env)
            const right = evaluate(expr.right, env)
            return evaluateBinaryOperator(left, right, expr.operator.node, env, locationOfExpr(expr))
        case 'if':
            const condition = evaluate(expr.condition, env)
            return splitMask(env, condition, (v: USSValue, subEnv: Context): USSValue => {
                if (v.type.type !== 'boolean') {
                    throw env.error(`Condition in if statement must be a boolean, but got ${renderType(v.type)}`, locationOfExpr(expr.condition))
                }
                if (v.value) {
                    return execute(expr.then, subEnv)
                }
                if (expr.else === undefined) {
                    return {
                        type: { type: 'null' },
                        value: null,
                    }
                }
                return execute(expr.else, subEnv)
            }, locationOfExpr(expr))
    }
}

export function execute(expr: UrbanStatsASTStatement, env: Context): USSValue {
    switch (expr.type) {
        case 'assignment':
            const value = evaluate(expr.value, env)
            evaluateLHS(expr.lhs, value, env)
            return value
        case 'expression':
            return evaluate(expr.value, env)
        case 'statements':
            let result: USSValue = execute(expr.result[0], env)
            for (const statement of expr.result.slice(1)) {
                result = execute(statement, env)
            }
            return result
    }
}

export function evaluateLHS(lhs: UrbanStatsASTLHS, value: USSValue, env: Context): void {
    switch (lhs.type) {
        case 'identifier':
            const varName = lhs.name.node
            env.variables.set(varName, value)
            return
        case 'attribute':
            // const obj = evaluate(lhs.expr, env)
            // const attr = lhs.name.node
            throw new Error('not implemented: attribute assignment')
    }
}

function evaluateArg(arg: UrbanStatsASTArg, env: Context): ValueArg {
    switch (arg.type) {
        case 'named':
            return {
                type: 'named',
                name: arg.name.node,
                value: evaluate(arg.value, env),
            }
        case 'unnamed':
            return {
                type: 'unnamed',
                value: evaluate(arg.value, env),
            }
    }
}

function attrLookup(obj: USSValue, attr: string): { type: 'success', value: USSValue } | { type: 'error' } {
    const type = obj.type
    if (type.type === 'object') {
        const val = obj.value
        if (!(val instanceof Map)) {
            throw new Error(`Expected object type because of ${renderType(type)}, but got ${typeof val} at ${JSON.stringify(obj.value)}`)
        }
        if (type.properties[attr] === undefined) {
            return {
                type: 'error',
            }
        }
        if (val.has(attr)) {
            return {
                type: 'success',
                value: {
                    type: type.properties[attr],
                    value: val.get(attr)!,
                },
            }
        }
        throw new Error(`Attribute ${attr} not found in object; expected one of ${Array.from(val.keys())} at ${JSON.stringify(obj.value)}`)
    }
    if (type.type === 'vector') {
        const val = obj.value
        if (!(val instanceof Array)) {
            throw new Error(`Expected vector type because of ${renderType(type)}, but got ${typeof val} at ${JSON.stringify(obj.value)}`)
        }
        const resultsOrErr = val.map(x => attrLookup({ value: x, type: type.elementType }, attr))
        if (resultsOrErr.some(r => r.type === 'error')) {
            return { type: 'error' }
        }
        const results = resultsOrErr.map(r => (r as { type: 'success', value: USSValue }).value)
        const rawValue = results.map(r => r.value)
        const typ = results[0].type
        return {
            type: 'success',
            value: {
                type: { type: 'vector', elementType: typ },
                value: rawValue,
            },
        }
    }
    return { type: 'error' }
}

function evaluateBinaryOperator(left: USSValue, right: USSValue, operator: string, env: Context, errLoc: LocInfo): USSValue {
    const operatorObj = infixOperatorMap.get(operator)
    if (operatorObj?.binary === undefined) {
        throw env.error(`Unknown operator: ${operator}`, errLoc)
    }
    const res = broadcastApply(
        operatorObj.binary(operator, errLoc),
        [left, right],
        [],
        env,
    )
    if (res.type === 'error') {
        throw env.error(res.message, errLoc)
    }
    return res.result
}
