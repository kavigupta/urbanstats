import { assert } from '../utils/defensive'

import { broadcastApply, broadcastCall } from './forward-broadcasting'
import { expressionOperatorMap, LocInfo } from './lexer'
import { locationOf, UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTLHS, UrbanStatsASTStatement } from './parser'
import { splitMask } from './split-broadcasting'
import { renderType, unifyType, USSRawValue, USSType, USSValue, ValueArg } from './types-values'

export type Effect = undefined

function renderLocInfo(loc: LocInfo): string {
    if (loc.start.lineIdx === loc.end.lineIdx) {
        if (loc.start.colIdx + 1 === loc.end.colIdx) {
            // Single character location
            return `${loc.start.lineIdx + 1}:${loc.start.colIdx + 1}`
        }
        return `${loc.start.lineIdx + 1}:${loc.start.colIdx + 1}-${loc.end.colIdx}`
    }
    return `${loc.start.lineIdx + 1}:${loc.start.colIdx + 1} - ${loc.end.lineIdx + 1}:${loc.end.colIdx}`
}

export class InterpretationError extends Error {
    public shortMessage: string
    constructor(message: string, public location: LocInfo) {
        super(`${message} at ${renderLocInfo(location)}`)
        this.name = 'InterpretationError'
        this.shortMessage = message
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
                throw env.error(`Attribute ${attr} not found in object of type ${renderType(obj.type)}`, locationOf(expr))
            }
            return lookupResult.value
        case 'function':
            const func = evaluate(expr.fn, env)
            const args = expr.args.map(arg => evaluateArg(arg, env))
            const broadcastResult = broadcastCall(func, args, env, locationOf(expr))
            if (broadcastResult.type === 'error') {
                throw env.error(broadcastResult.message, locationOf(expr))
            }
            return broadcastResult.result
        case 'unaryOperator':
            const operand = evaluate(expr.expr, env)
            return evaluateUnaryOperator(operand, expr.operator.node, env, locationOf(expr))
        case 'binaryOperator':
            const left = evaluate(expr.left, env)
            const right = evaluate(expr.right, env)
            return evaluateBinaryOperator(left, right, expr.operator.node, env, locationOf(expr))
        case 'vectorLiteral':
            const elements = expr.elements.map(e => evaluate(e, env))
            let elementType = { type: 'elementOfEmptyVector' } as USSType | { type: 'elementOfEmptyVector' }
            for (const e of elements) {
                elementType = unifyType(elementType, e.type, () => {
                    assert(elementType.type !== 'elementOfEmptyVector', `Unreachable: elementType should not be elementOfEmptyVector at ${JSON.stringify(e.value)}`)
                    return env.error(`vector literal contains heterogenous types ${renderType(elementType)} and ${renderType(e.type)}`, locationOf(expr))
                })
            }
            return {
                type: { type: 'vector', elementType },
                value: elements.map(e => e.value),
            }
        case 'objectLiteral':
            const ts = new Map<string, USSType>()
            const vs = new Map<string, USSRawValue>()
            for (const [name, e] of expr.properties) {
                const v = evaluate(e, env)
                if (ts.has(name)) {
                    throw env.error(`Duplicate key ${name} in object literal`, locationOf(e))
                }
                ts.set(name, v.type)
                vs.set(name, v.value)
            }
            return {
                type: {
                    type: 'object',
                    properties: ts,
                },
                value: vs,
            }
        case 'if':
            const condition = evaluate(expr.condition, env)
            return splitMask(
                env,
                condition,
                (v: USSValue, subEnv: Context): USSValue => {
                    if (v.type.type !== 'boolean') {
                        throw env.error(`Condition in if statement must be a boolean, but got ${renderType(v.type)}`, locationOf(expr.condition))
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
                },
                locationOf(expr.condition),
                locationOf(expr),
            )
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
            if (expr.result.length === 0) {
                return {
                    type: { type: 'null' },
                    value: null,
                }
            }
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
        assert(val instanceof Map, `Expected object type because of ${renderType(type)}, but got ${typeof val} at ${JSON.stringify(obj.value)}`)
        const aT = type.properties.get(attr)
        if (aT === undefined) {
            return {
                type: 'error',
            }
        }
        const content = val.get(attr)
        assert(content !== undefined, `Expected attribute ${attr} to be defined in object, but got undefined at ${JSON.stringify(obj.value)}`)
        return {
            type: 'success',
            value: {
                type: aT,
                value: val.get(attr)!,
            },
        }
    }
    if (type.type === 'vector') {
        const val = obj.value
        assert(val instanceof Array, `Expected vector type because of ${renderType(type)}, but got ${typeof val} at ${JSON.stringify(obj.value)}`)
        const resultsOrErr = val.map((x) => {
            assert(type.elementType.type !== 'elementOfEmptyVector', `Unreachable: elementType should not be elementOfEmptyVector at ${JSON.stringify(obj.value)}`)
            return attrLookup({ value: x, type: type.elementType }, attr)
        })
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

function evaluateUnaryOperator(operand: USSValue, operator: string, env: Context, errLoc: LocInfo): USSValue {
    const operatorObj = expressionOperatorMap.get(operator)
    assert(operatorObj?.unary !== undefined, `Unknown operator: ${operator}`)
    const res = broadcastApply(
        operatorObj.unary(operator, errLoc),
        [operand],
        [],
        env,
        errLoc,
    )
    if (res.type === 'error') {
        throw env.error(res.message, errLoc)
    }
    return res.result
}

function evaluateBinaryOperator(left: USSValue, right: USSValue, operator: string, env: Context, errLoc: LocInfo): USSValue {
    const operatorObj = expressionOperatorMap.get(operator)
    assert (operatorObj?.binary !== undefined, `Unknown operator: ${operator}`)
    const res = broadcastApply(
        operatorObj.binary(operator, errLoc),
        [left, right],
        [],
        env,
        errLoc,
    )
    if (res.type === 'error') {
        throw env.error(res.message, errLoc)
    }
    return res.result
}
