import { infixOperatorsPrecedence, LocInfo } from './lexer'
import { locationOfExpr, UrbanStatsASTArg, UrbanStatsASTExpression } from './parser'
import { broadcastApply, broadcastCall, USSRawValue, USSValue, ValueArg } from './types-values'

type Effect = undefined

export interface Context {
    effect: (eff: Effect) => void
    error: (msg: string, location: LocInfo) => Error
    env: Record<string, USSValue>
}

function evaluate(expr: UrbanStatsASTExpression, env: Context): USSValue {
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
            if (varName in env.env) {
                return env.env[varName]
            }
            throw env.error(`Undefined variable: ${varName}`, expr.name.location)
        case 'attribute':
            const obj = evaluate(expr.expr, env)
            const attr = expr.name.node
            return attrLookup(obj, attr, expr.name.location)
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

function attrLookup(obj: USSValue, attr: string, location: LocInfo): USSValue {
    // if (obj.type === 'object') {
    if (obj instanceof Map) {
        if (obj.has(attr)) {
            return obj.get(attr) as USSValue
        }
        throw new Error(`Attribute ${attr} not found in object at ${JSON.stringify(location)}`)
    }
    throw new Error(`Cannot access attribute ${attr} of non-object type at ${JSON.stringify(location)}`)
}

function evaluateInfixSequence(elements: USSValue[], operators: string[], env: Context, errLoc: LocInfo): USSValue {
    if (elements.length !== operators.length + 1) {
        throw new Error(`Invalid infix sequence: ${elements.length} elements and ${operators.length} operators`)
    }
    if (elements.length === 1) {
        return elements[0]
    }
    const maxPrecedence = Math.max(...operators.map(op => infixOperatorsPrecedence.get(op) ?? 0))
    if (maxPrecedence === 0) {
        throw new Error(`No valid operator found in infix sequence`)
    }
    const firstOp = operators.findIndex(op => infixOperatorsPrecedence.get(op) === maxPrecedence)
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
    if (operator === '+') {
        return left + right
    }
    throw new Error(`Unsupported operator: ${operator}`)
}
