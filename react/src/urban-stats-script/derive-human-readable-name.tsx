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
            const centerOp = expressionOperatorMap.get(ast.operator.node)!
            /*
             * (A op1 B) op2 C => A op1 B op2 C iff prec(op1) > prec(op2) or op1 = op2
             * A op1 (B op2 C) => A op1 B op2 C iff prec(op2) > prec(op1) or (op1 = op2 and is_assoc(op1))
             */
            let lhs = humanReadableElements(ast.left, typeEnvironment)
            if (lhs === undefined) return
            if (ast.left.type === 'binaryOperator') {
                const leftOp = expressionOperatorMap.get(ast.left.operator.node)!
                if (!(leftOp.precedence > centerOp.precedence
                    || leftOp === centerOp)) {
                    lhs = [{ type: 'parens', value: lhs }]
                }
            }

            let rhs = humanReadableElements(ast.right, typeEnvironment)
            if (rhs === undefined) return
            if (ast.right.type === 'binaryOperator') {
                const rightOp = expressionOperatorMap.get(ast.right.operator.node)!
                assert('binary' in centerOp, 'Unexpected non-binary operation')
                if (!(rightOp.precedence > centerOp.precedence || (centerOp === rightOp && centerOp.isAssociative))) {
                    rhs = [{ type: 'parens', value: rhs }]
                }
            }

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
    return elements.map((element, index) => {
        switch (element.type) {
            case 'atom':
                return element.value
            case 'subscript':
                return <sub key={index}>{reifyReact(element.value)}</sub>
            case 'superscript':
                return <sup key={index}>{reifyReact(element.value)}</sup>
            case 'where':
                return (
                    <React.Fragment key={index}>
                        {' where '}
                        {reifyReact(element.value)}
                    </React.Fragment>
                )
            case 'parens':
                return (
                    <React.Fragment key={index}>
                        (
                        {reifyReact(element.value)}
                        )
                    </React.Fragment>
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
