import React, { ReactNode } from 'react'

import { MapUSS, mapUssParser } from '../mapper/settings/map-uss'
import { assert } from '../utils/defensive'

import { UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import * as l from './literal-parser'
import { noLocation } from './location'
import { expressionOperatorMap } from './operators'
import { HumanReadableName, TypeEnvironment } from './types-values'

export type HumanReadableElement = { type: 'atom', value: string } | { type: 'where' | 'superscript' | 'subscript' | 'parens', value: HumanReadableElement[] }

function humanReadableElements(ast: UrbanStatsASTExpression | UrbanStatsASTStatement, typeEnvironment: TypeEnvironment): HumanReadableElement[] | undefined {
    switch (ast.type) {
        case 'assignment':
            return humanReadableElements(ast.value, typeEnvironment)
        case 'autoUXNode':
            return humanReadableElements(ast.expr, typeEnvironment)
        case 'binaryOperator': {
            // If a child expression is another operator, and it's lower precedence, then it should be wrapped in parenthesis for clarity
            const wrapInParensIfLowerPrecedence = (expr: UrbanStatsASTExpression): HumanReadableElement[] | undefined => {
                const value = humanReadableElements(expr, typeEnvironment)
                if (value === undefined) return
                if (expr.type === 'binaryOperator' && expressionOperatorMap.get(expr.operator.node)!.precedence < expressionOperatorMap.get(ast.operator.node)!.precedence) {
                    return [{ type: 'parens', value }]
                }
                return value
            }

            const lhs = wrapInParensIfLowerPrecedence(ast.left)
            const rhs = wrapInParensIfLowerPrecedence(ast.right)
            if (lhs === undefined || rhs === undefined) return
            let humanReadableOperator: string
            switch (ast.operator.node) {
                case '**':
                    return [...lhs, { type: 'superscript', value: rhs }]
                case '/':
                    humanReadableOperator = '÷'
                    break
                case '-':
                    humanReadableOperator = '−'
                    break
                case '==':
                    humanReadableOperator = '='
                    break
                case '!=':
                    humanReadableOperator = '≠'
                    break
                case '<':
                    humanReadableOperator = '<'
                    break
                case '>':
                    humanReadableOperator = '>'
                    break
                case '<=':
                    humanReadableOperator = '≤'
                    break
                case '>=':
                    humanReadableOperator = '≥'
                    break
                case '&':
                    humanReadableOperator = 'and'
                    break
                case '|':
                    humanReadableOperator = 'or'
                    break
                case '*':
                    humanReadableOperator = '×'
                    break
                case '+':
                    humanReadableOperator = '+'
                    break
            }

            return [...lhs, { type: 'atom', value: ` ${humanReadableOperator} ` }, ...rhs]
        }
        case 'identifier':
            const identifierName = typeEnvironment.get(ast.name.node)?.documentation?.humanReadableName
            if (identifierName === undefined) return
            if (typeof identifierName === 'string') return [{ type: 'atom', value: identifierName }]
            return identifierName
        case 'constant':
            switch (ast.value.node.type) {
                case 'humanReadableElements':
                    return ast.value.node.value
                case 'number':
                case 'string':
                    return [{ type: 'atom', value: String(ast.value.node.value) }]
            }
        case 'unaryOperator': {
            const operand = humanReadableElements(ast.expr, typeEnvironment)
            if (operand === undefined) return
            let operator: HumanReadableElement[]
            switch (ast.operator.node) {
                case '!':
                    operator = [{ type: 'atom', value: 'not ' }]
                    break
                case '+':
                    operator = []
                    break
                case '-':
                    operator = [{ type: 'atom', value: '-' }]
                    break
            }
            return [...operator, ...operand]
        }
        case 'customNode':
            return humanReadableElements(ast.expr, typeEnvironment)
        case 'expression':
            return humanReadableElements(ast.value, typeEnvironment)
        case 'call': {
            const fn = humanReadableElements(ast.fn, typeEnvironment)
            if (fn === undefined) return
            const args: HumanReadableElement[][] = []
            for (const arg of ast.args) {
                const humanArg = humanReadableElements(arg.value, typeEnvironment)
                if (humanArg === undefined) return
                switch (arg.type) {
                    case 'named':
                        args.push([{ type: 'atom', value: `${arg.name.node} = ` }, ...humanArg])
                        break
                    case 'unnamed':
                        args.push(humanArg)
                        break
                }
            }
            const argsFlat: HumanReadableElement[] = []
            for (let i = 0; i < args.length; i++) {
                if (i > 0) argsFlat.push({ type: 'atom', value: ', ' })
                argsFlat.push(...args[i])
            }
            return [...fn, { type: 'atom', value: '(' }, ...argsFlat, { type: 'atom', value: ')' }]
        }
        case 'do':
            if (ast.statements.length === 0) return
            return humanReadableElements(ast.statements[ast.statements.length - 1], typeEnvironment)
        case 'statements':
            if (ast.result.length === 0) return
            return humanReadableElements(ast.result[ast.result.length - 1], typeEnvironment)
        case 'condition': {
            if (ast.rest.length === 0) return
            const rest = humanReadableElements(ast.rest[ast.rest.length - 1], typeEnvironment)
            if (rest === undefined) return
            const cond = humanReadableElements(ast.condition, typeEnvironment)
            if (cond === undefined) return

            // Special Case: condition that is just "true" is not interesting
            if (cond.length === 1 && cond[0].type === 'atom' && cond[0].value === 'true') {
                return rest
            }

            // Consolidate adjacent wheres
            const last = rest.length > 0 ? rest[rest.length - 1] : undefined
            if (last?.type === 'where') {
                return [...rest.slice(0, rest.length - 1), { type: 'where', value: [...last.value, { type: 'atom', value: ' and ' }, ...cond] }]
            }

            return [...rest, { type: 'where', value: cond }]
        }
        case 'objectLiteral':
        case 'vectorLiteral':
        case 'if':
        case 'attribute':
        case 'parseError':
            return undefined
    }
}

export function reifyReact(elements: HumanReadableElement[] | string): ReactNode {
    if (typeof elements === 'string') return elements
    return elements.map((element) => {
        switch (element.type) {
            case 'atom':
                return element.value
            case 'subscript':
                return <sub>{reifyReact(element.value)}</sub>
            case 'superscript':
                return <sup>{reifyReact(element.value)}</sup>
            case 'where':
                return (
                    <>
                        {' where '}
                        {reifyReact(element.value)}
                    </>
                )
            case 'parens':
                return (
                    <>
                        (
                        {reifyReact(element.value)}
                        )
                    </>
                )
        }
    })
}

export function reifyString(elements: HumanReadableElement[] | string): string {
    if (typeof elements === 'string') return elements
    return elements.map((element) => {
        switch (element.type) {
            case 'atom':
                return element.value
            case 'subscript':
                return `_{${reifyString(element.value)}}`
            case 'superscript':
                return `^{${reifyString(element.value)}}`
            case 'where':
                return ` where ${reifyString(element.value)}`
            case 'parens':
                return `(${reifyString(element.value)})`
        }
    }).join('')
}

export function deriveMapLabel(uss: MapUSS, typeEnvironment: TypeEnvironment): HumanReadableName | undefined {
    const schema = mapUssParser(l.edit(l.call({
        fn: l.ignore(),
        namedArgs: {
            data: l.passthrough(),
        },
        unnamedArgs: [],
    })), 'dont-reparse')
    try {
        const result = schema(uss, typeEnvironment)
        if (result.currentValue.namedArgs.data === undefined) return
        const dataLabel = humanReadableElements(result.currentValue.namedArgs.data, typeEnvironment)
        if (dataLabel === undefined) return
        // Replace the map call with just the data description to simplify the label (we know it's a map)
        const withMapCallReplacedByDataLabel = result.edit({ type: 'constant', value: { node: { type: 'humanReadableElements', value: dataLabel }, location: noLocation } })
        assert(withMapCallReplacedByDataLabel !== undefined, 'should not happen')
        return humanReadableElements(withMapCallReplacedByDataLabel, typeEnvironment)
    }
    catch (error) {
        if (error instanceof l.LiteralParseError) {
            return undefined
        }
        throw error
    }
}
