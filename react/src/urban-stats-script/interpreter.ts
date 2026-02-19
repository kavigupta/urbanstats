import { assert } from '../utils/defensive'

import { UrbanStatsASTStatement, UrbanStatsASTExpression, UrbanStatsASTLHS, UrbanStatsASTArg, locationOf, unify } from './ast'
import { Context } from './context'
import { addAdditionalDims, broadcastApply, broadcastCall } from './forward-broadcasting'
import { LocInfo } from './location'
import { expressionOperatorMap } from './operators'
import { splitMask } from './split-broadcasting'
import { renderType, unifyType, USSRawValue, USSType, USSValue, USSVectorType, ValueArg, undocValue, canUnifyTo } from './types-values'

export interface Effect { type: 'warning', message: string, location: LocInfo }

export function renderLocInfo(loc: LocInfo): string {
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
    public value: string
    constructor(message: string, public location: LocInfo) {
        super(`${message} at ${renderLocInfo(location)}`)
        this.name = 'InterpretationError'
        this.value = message
        this.location = location
    }
}

export function evaluate(expr: UrbanStatsASTExpression, env: Context): USSValue {
    switch (expr.type) {
        case 'constant':
            const value = expr.value.node
            if (value.type === 'number') {
                return undocValue(value.value, { type: 'number' })
            }
            return undocValue(value.value satisfies string, { type: 'string' })
        case 'identifier':
            const varName = expr.name.node
            const res = env.getVariable(varName)
            if (res !== undefined) {
                if (res.documentation?.deprecated) {
                    env.effect({
                        type: 'warning',
                        message: `Deprecated: ${res.documentation.deprecated}`,
                        location: expr.name.location,
                    })
                }
                return res
            }
            throw env.error(`Undefined variable: ${varName}`, expr.name.location)
        case 'attribute':
            const obj = evaluate(expr.expr, env)
            const attr = expr.name.node
            const lookupResult = attrLookupOrSet(obj, attr, undefined)
            if (lookupResult.type === 'error') {
                throw env.error(lookupResult.message, locationOf(expr))
            }
            return lookupResult.value
        case 'call':
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
            return undocValue(elements.map(e => e.value), { type: 'vector', elementType })
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
            return undocValue(vs, {
                type: 'object',
                properties: ts,
            })
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
                        return undocValue(null, { type: 'null' })
                    }
                    return execute(expr.else, subEnv)
                },
                locationOf(expr.condition),
                locationOf(expr),
            )
        case 'do':
            if (expr.statements.length === 0) {
                return undocValue(null, { type: 'null' })
            }
            let doResult: USSValue = execute(expr.statements[0], env)
            for (const statement of expr.statements.slice(1)) {
                doResult = execute(statement, env)
            }
            return doResult
        case 'customNode':
            // This is a custom node for internal purposes, we just evaluate the expression
            const result = execute(expr.expr, env)

            // Check type if expectedType is provided
            if (expr.expectedType && !expr.expectedType.some(t => canUnifyTo(result.type, t))) {
                throw env.error(
                    `Custom expression expected to return type ${expr.expectedType.map(t => renderType(t)).join(' or ')}, but got ${renderType(result.type)}`,
                    locationOf(expr),
                )
            }

            return result
        case 'autoUXNode':
            // autoUXNode is an annotation that wraps an expression with metadata
            return evaluate(expr.expr, env)
    }
}

export function execute(expr: UrbanStatsASTStatement, env: Context): USSValue {
    switch (expr.type) {
        case 'condition':
            if (expr.rest.length === 0) {
                throw env.error('condition(..) must be followed by at least one statement', locationOf(expr))
            }
            return evaluate(
                { type: 'if',
                    condition: expr.condition,
                    then: { type: 'statements', result: expr.rest, entireLoc: unify(...expr.rest.map(locationOf)) },
                    entireLoc: expr.entireLoc,
                },
                env,
            )
        case 'assignment':
            const value = evaluate(expr.value, env)
            evaluateLHS(expr.lhs, value, env)
            return value
        case 'expression':
            return evaluate(expr.value, env)
        case 'statements':
            if (expr.result.length === 0) {
                return undocValue(null, { type: 'null' })
            }
            let result: USSValue = execute(expr.result[0], env)
            for (const statement of expr.result.slice(1)) {
                result = execute(statement, env)
            }
            return result
        case 'parseError':
            assert(expr.errors.length > 0, 'parseError node must have at least one error')
            throw env.error(
                `Parse error: ${expr.errors.map(e => e.value).join(', ')}`,
                expr.errors[0].location,
            )
    }
}

export function evaluateLHS(lhs: UrbanStatsASTLHS, value: USSValue, env: Context): void {
    switch (lhs.type) {
        case 'identifier':
            const varName = lhs.name.node
            const err = env.assignVariable(varName, value)
            if (err !== undefined) {
                throw env.error(err, locationOf(lhs))
            }
            return
        case 'attribute':
            const obj = evaluate(lhs.expr, env)
            const attr = lhs.name.node
            const lookupResult = attrLookupOrSet(obj, attr, value)
            if (lookupResult.type === 'error') {
                throw env.error(lookupResult.message, locationOf(lhs))
            }
            return
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

function attrLookupOrSet(
    obj: USSValue,
    attr: string,
    orSet: USSValue | undefined,
): { type: 'success', value: USSValue } | { type: 'error', message: string } {
    const type = obj.type
    if (type.type === 'object') {
        const val = obj.value
        assert(val instanceof Map, `Expected object type because of ${renderType(type)}, but got ${typeof val} at ${JSON.stringify(obj.value)}`)
        const aT = type.properties.get(attr)
        if (aT === undefined) {
            return {
                type: 'error',
                message: `Attribute ${attr} not found in object of type ${renderType(type)}`,
            }
        }
        if (orSet !== undefined) {
            if (renderType(aT) !== renderType(orSet.type)) {
                return {
                    type: 'error',
                    message: `Type mismatch: expected ${renderType(aT)} but got ${renderType(orSet.type)} for attribute ${attr} in object of type ${renderType(type)}`,
                }
            }
            // If orSet is provided, we set the attribute to the value
            val.set(attr, orSet.value)
            return {
                type: 'success',
                value: undocValue(orSet.value, aT),
            }
        }
        const content = val.get(attr)
        assert(content !== undefined, `Expected attribute ${attr} to be defined in object, but got undefined at ${JSON.stringify(obj.value)}`)
        return {
            type: 'success',
            value: undocValue(val.get(attr)!, aT),
        }
    }
    if (type.type === 'vector') {
        const val = obj.value
        assert(val instanceof Array, `Expected vector type because of ${renderType(type)}, but got ${typeof val} at ${JSON.stringify(obj.value)}`)
        let orSetLookp: (idx: number) => USSValue | undefined = () => undefined
        if (orSet !== undefined) {
            if (orSet.type.type !== 'vector') {
                orSet = undocValue(addAdditionalDims([val.length], orSet.value), { type: 'vector', elementType: orSet.type })
            }
            assert(Array.isArray(orSet.value), `It should be an array at this point`)
            if (orSet.value.length !== val.length) {
                return { type: 'error', message: `Expected vector of length ${val.length} but got ${orSet.value.length} for attribute ${attr} in object of type ${renderType(type)}` }
            }
            const v = orSet.value
            const t = (orSet.type as USSVectorType).elementType
            assert(t.type !== 'elementOfEmptyVector', `Unreachable: elementType should not be elementOfEmptyVector at ${JSON.stringify(orSet.value)}`)
            orSetLookp = (idx: number) => {
                return undocValue(v[idx], t)
            }
        }
        const resultsOrErr = val.map((x, i) => {
            assert(type.elementType.type !== 'elementOfEmptyVector', `Unreachable: elementType should not be elementOfEmptyVector at ${JSON.stringify(obj.value)}`)
            return attrLookupOrSet(undocValue(x, type.elementType), attr, orSetLookp(i))
        })
        if (resultsOrErr.some(r => r.type === 'error')) {
            return { type: 'error', message: resultsOrErr.filter(r => r.type === 'error').map(r => (r as { type: 'error', message: string }).message)[0] }
        }
        const results = resultsOrErr.map(r => (r as { type: 'success', value: USSValue }).value)
        const rawValue = results.map(r => r.value)
        const typ = results[0].type
        return {
            type: 'success',
            value: undocValue(rawValue, { type: 'vector', elementType: typ }),
        }
    }
    return { type: 'error', message: `Cannot access attribute of type ${renderType(type)}. Only objects and vectors support attributes.` }
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
    assert(operatorObj?.binary !== undefined, `Unknown operator: ${operator}`)
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
