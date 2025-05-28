import { infixOperatorMap, LocInfo } from './lexer'
import { locationOfExpr, UrbanStatsASTArg, UrbanStatsASTExpression } from './parser'
import { broadcastApply, broadcastCall, renderType, USSRawValue, USSValue, ValueArg } from './types-values'

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
    get: (name: string) => USSValue | undefined
    set: (name: string, value: USSValue) => void
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
            const res = env.get(varName)
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
        case 'infixSequence':
            const elements = expr.expressions.map(e => evaluate(e, env))
            return evaluateInfixSequence(elements, expr.operators.map(x => x.node), env, locationOfExpr(expr))
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

function evaluateInfixSequence(elements: USSValue[], operators: string[], env: Context, errLoc: LocInfo): USSValue {
    if (elements.length !== operators.length + 1) {
        throw new Error(`Invalid infix sequence: ${elements.length} elements and ${operators.length} operators`)
    }
    if (elements.length === 1) {
        return elements[0]
    }
    const maxPrecedence = Math.max(...operators.map(op => infixOperatorMap.get(op)?.precedence ?? 0))
    if (maxPrecedence === 0) {
        throw new Error(`No valid operator found in infix sequence`)
    }
    const firstOp = operators.findIndex(op => infixOperatorMap.get(op)?.precedence === maxPrecedence)
    if (firstOp === -1) {
        throw new Error(`No valid operator found in infix sequence`)
    }
    const left = elements[firstOp]
    const right = elements[firstOp + 1]
    const operator = operators[firstOp]
    const newElements = [
        ...elements.slice(0, firstOp),
        evaluateBinaryOperator(left, right, operator, env, errLoc),
        ...elements.slice(firstOp + 2),
    ]
    const newOperators = [
        ...operators.slice(0, firstOp),
        ...operators.slice(firstOp + 1),
    ]
    return evaluateInfixSequence(newElements, newOperators, env, errLoc)
}

function evaluateBinaryOperator(left: USSValue, right: USSValue, operator: string, env: Context, errLoc: LocInfo): USSValue {
    const res = broadcastApply(
        {
            type: { type: 'function', posArgs: [{ type: 'number' }, { type: 'number' }], namedArgs: {}, returnType: { type: 'number' } },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for type signature
            value: (ctx: Context, posArgs: USSRawValue[], _namedArgs: Record<string, USSRawValue>): USSRawValue => {
                return directEvaluateBinaryOperator(operator, posArgs[0] as number, posArgs[1] as number)
            },
        },
        [left, right],
        [],
        env,
    )
    if (res.type === 'error') {
        throw env.error(res.message, errLoc)
    }
    return res.result
}

function directEvaluateBinaryOperator(operator: string, left: number, right: number): number {
    const op = infixOperatorMap.get(operator)
    if (!op) {
        throw new Error(`Unknown operator: ${operator}`)
    }
    return op.fn(left, right)
}
