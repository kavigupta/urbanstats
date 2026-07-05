import { MapUSS, mapUssParser } from '../mapper/settings/map-uss'
import * as l from '../urban-stats-script/literal-parser'
import { assert } from '../utils/defensive'

import { UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { noLocation } from './location'
import { TypeEnvironment } from './types-values'

export function deriveHumanReadableName(ast: UrbanStatsASTExpression | UrbanStatsASTStatement, typeEnvironment: TypeEnvironment): string | undefined {
    switch (ast.type) {
        case 'assignment':
            return deriveHumanReadableName(ast.value, typeEnvironment)
        case 'autoUXNode':
            return deriveHumanReadableName(ast.expr, typeEnvironment)
        case 'binaryOperator': {
            const lhs = deriveHumanReadableName(ast.left, typeEnvironment)
            const rhs = deriveHumanReadableName(ast.right, typeEnvironment)
            return lhs && rhs ? `${lhs} ${ast.operator.node} ${rhs}` : undefined
        }
        case 'identifier':
            return typeEnvironment.get(ast.name.node)?.documentation?.humanReadableName
        case 'constant':
            return String(ast.value.node.value)
        case 'unaryOperator': {
            const operand = deriveHumanReadableName(ast.expr, typeEnvironment)
            return operand && `${ast.operator.node}${operand}`
        }
        case 'customNode':
            return deriveHumanReadableName(ast.expr, typeEnvironment)
        case 'expression':
            return deriveHumanReadableName(ast.value, typeEnvironment)
        case 'call':
            const fn = deriveHumanReadableName(ast.fn, typeEnvironment)
            if (fn === undefined) return
            const args = []
            for (const arg of ast.args) {
                const humanArg = deriveHumanReadableName(arg.value, typeEnvironment)
                if (humanArg === undefined) return
                switch (arg.type) {
                    case 'named':
                        args.push(`${arg.name.node} = ${humanArg}`)
                        break
                    case 'unnamed':
                        args.push(humanArg)
                        break
                }
            }
            return `${fn}(${args.join(', ')})`
        case 'do':
            if (ast.statements.length === 0) return
            return deriveHumanReadableName(ast.statements[ast.statements.length - 1], typeEnvironment)
        case 'statements':
            if (ast.result.length === 0) return
            return deriveHumanReadableName(ast.result[ast.result.length - 1], typeEnvironment)
        case 'condition':
            if (ast.rest.length === 0) return
            const rest = deriveHumanReadableName(ast.rest[ast.rest.length - 1], typeEnvironment)
            if (rest === undefined) return
            const cond = deriveHumanReadableName(ast.condition, typeEnvironment)
            if (cond === undefined) return

            // Special Case: condition that is just "true" is not interesting
            if (cond === 'true') {
                return rest
            }

            return `${rest} where ${cond}`
        case 'objectLiteral':
        case 'vectorLiteral':
        case 'if':
        case 'attribute':
        case 'parseError':
            return undefined
    }
}

export function deriveMapLabel(uss: MapUSS, typeEnvironment: TypeEnvironment): string | undefined {
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
        const dataLabel = deriveHumanReadableName(result.currentValue.namedArgs.data, typeEnvironment)
        if (dataLabel === undefined) return
        // Replace the map call with just the data description to simplify the label (we know it's a map)
        const withMapCallReplacedByDataLabel = result.edit({ type: 'constant', value: { node: { type: 'string', value: dataLabel }, location: noLocation } })
        assert(withMapCallReplacedByDataLabel !== undefined, 'should not happen')
        return deriveHumanReadableName(withMapCallReplacedByDataLabel, typeEnvironment)
    }
    catch (error) {
        if (error instanceof l.LiteralParseError) {
            return undefined
        }
        throw error
    }
}
