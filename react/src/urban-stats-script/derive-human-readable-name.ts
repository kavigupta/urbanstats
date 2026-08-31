import { editableMapData, MapUSS, mapUssParser, read, tableColumnExpression } from '../mapper/settings/map-uss'
import { assert } from '../utils/defensive'
import { HumanReadableElement, HumanReadableName } from '../utils/human-readable-element'
import { joinHumanReadableNames } from '../utils/human-readable-name'
import { parseHumanReadableTemplate } from '../utils/human-readable-template'
import { nameOfStoredUnit, StoredUnit } from '../utils/quantity'
import { abbreviate, formatToSignificantFigures, separateNumber, trimTrailingZeros } from '../utils/text'

import { UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import * as l from './literal-parser'
import { noLocation } from './location'
import { expressionOperatorMap } from './operators'
import { TypeEnvironment } from './types-values'
import { ReadInUnits, readAsANumber, unitCheck } from './unit-inference'

type Expression = UrbanStatsASTExpression<ReadInUnits>

/** What is written where an expression is: a toNumber writes its argument, brackets and all. */
function reads(ast: Expression, typeEnvironment: TypeEnvironment): Expression {
    return readAsANumber<ReadInUnits>(ast, { typeEnvironment, named: new Map() })?.read ?? ast
}

function humanReadableElements(ast: Expression | UrbanStatsASTStatement<ReadInUnits>, typeEnvironment: TypeEnvironment, bracketOperators = false): HumanReadableElement[] | undefined {
    switch (ast.type) {
        case 'assignment':
            return humanReadableElements(ast.value, typeEnvironment)
        case 'autoUXNode':
            return humanReadableElements(ast.expr, typeEnvironment)
        case 'binaryOperator': {
            const centerOp = expressionOperatorMap[ast.operator.node]
            /*
             * (A op1 B) op2 C => A op1 B op2 C iff prec(op1) > prec(op2) or op1 = op2
             * A op1 (B op2 C) => A op1 B op2 C iff prec(op2) > prec(op1) or (op1 = op2 and is_assoc(op1))
             */
            let lhs = humanReadableElements(ast.left, typeEnvironment)
            if (lhs === undefined) return
            const written = { left: reads(ast.left, typeEnvironment), right: reads(ast.right, typeEnvironment) }
            if (written.left.type === 'binaryOperator') {
                const leftOp = expressionOperatorMap[written.left.operator.node]
                if (!(leftOp.precedence > centerOp.precedence
                    || leftOp === centerOp)) {
                    lhs = [{ type: 'parens', value: lhs }]
                }
            }

            let rhs = humanReadableElements(ast.right, typeEnvironment)
            if (rhs === undefined) return
            if (written.right.type === 'binaryOperator') {
                const rightOp = expressionOperatorMap[written.right.operator.node]
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
                    return formatNumber(ast.value.node.value, ast.readIn)
                case 'string':
                    return [{ type: 'atom', value: ast.value.node.value }]
            }
        case 'unaryOperator': {
            const operand = humanReadableElements(ast.expr, typeEnvironment, true)
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
            const readNumber = readAsANumber<ReadInUnits>(ast, { typeEnvironment, named: new Map() })
            if (readNumber !== undefined) {
                // toNumber says its argument is read as a number, which writing a number says
                const unit = ast.readIn
                if (readNumber.value !== undefined) return formatNumber(readNumber.value, unit)
                const written = humanReadableElements(readNumber.read, typeEnvironment)
                if (written === undefined) return
                // a sign is written outside what follows it, so -toNumber(a + b) would read -a + b
                const inner: HumanReadableElement[] = bracketOperators && readNumber.read.type === 'binaryOperator'
                    ? [{ type: 'parens', value: written }]
                    : written
                return inUnitWritten(inner, unit)
            }
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

/** The label a script states outright, which running it would otherwise be the only way to read. */
const statedLabel = mapUssParser(l.call({
    fn: l.ignore(),
    namedArgs: { label: l.optional(l.string()) },
    unnamedArgs: [],
}), 'dont-reparse')

function statedMapLabel(uss: MapUSS, typeEnvironment: TypeEnvironment): HumanReadableName | undefined {
    const label = read(statedLabel, uss, typeEnvironment)?.namedArgs.label
    return label === undefined ? undefined : parseHumanReadableTemplate(label)
}

export function deriveMapLabel(uss: MapUSS, typeEnvironment: TypeEnvironment): HumanReadableName | undefined {
    const { ast: factored } = unitCheck(uss, typeEnvironment)
    const result = read(editableMapData<ReadInUnits>(), factored, typeEnvironment)
    if (result?.currentValue.namedArgs.data === undefined) return
    const dataLabel = humanReadableElements((result.currentValue.namedArgs.data), typeEnvironment)
    if (dataLabel === undefined) return
    // Replace the map call with just the data description to simplify the label (we know it's a map)
    const withMapCallReplacedByDataLabel = result.edit({ type: 'constant', value: { node: { type: 'humanReadableElements', value: dataLabel }, location: noLocation } })
    assert(withMapCallReplacedByDataLabel !== undefined, 'should not happen')
    return humanReadableElements((withMapCallReplacedByDataLabel), typeEnvironment)
}

export function mapLabel(uss: MapUSS, typeEnvironment: TypeEnvironment): HumanReadableName | undefined {
    return statedMapLabel(uss, typeEnvironment) ?? deriveMapLabel(uss, typeEnvironment)
}

/** The title a table states outright, which running it would otherwise be the only way to read. */
const statedTitle = mapUssParser(l.call({
    fn: l.ignore(),
    namedArgs: { title: l.optional(l.string()) },
    unnamedArgs: [],
}), 'dont-reparse')

function statedTableTitle(uss: MapUSS, typeEnvironment: TypeEnvironment): HumanReadableName | undefined {
    const title = read(statedTitle, uss, typeEnvironment)?.namedArgs.title
    return title === undefined ? undefined : parseHumanReadableTemplate(title)
}

/** Every column's name, stated or derived. Undefined if any one of them cannot be read. */
const statedColumnNames = mapUssParser<{ namedArgs: { columns: { namedArgs: { values: Expression | undefined, name: string | undefined } }[] } }, ReadInUnits>(l.call({
    fn: l.ignore(),
    namedArgs: {
        columns: l.vector(l.call({
            fn: l.ignore(),
            namedArgs: {
                values: l.passthrough<ReadInUnits>(),
                name: l.optional(l.string()),
            },
            unnamedArgs: [],
        })),
    },
    unnamedArgs: [],
}), 'dont-reparse')

function tableColumnLabels(uss: MapUSS, typeEnvironment: TypeEnvironment): HumanReadableName[] | undefined {
    const { ast: factored } = unitCheck(uss, typeEnvironment)
    const columns = read(statedColumnNames, factored, typeEnvironment)?.namedArgs.columns
    if (columns === undefined) {
        return undefined
    }
    const labels = columns.map((column): HumanReadableName | undefined => {
        if (column.namedArgs.name !== undefined) {
            return parseHumanReadableTemplate(column.namedArgs.name)
        }
        return column.namedArgs.values === undefined ? undefined : humanReadableElements((column.namedArgs.values), typeEnvironment)
    })
    return labels.every(label => label !== undefined) ? labels : undefined
}

/** The filter a script applies, or undefined for the `condition (true)` that filters nothing. */
export function deriveConditionLabel(uss: MapUSS, typeEnvironment: TypeEnvironment): HumanReadableName | undefined {
    const { ast: factored } = unitCheck(uss, typeEnvironment)
    if (factored.type !== 'statements') {
        return undefined
    }
    const condition = humanReadableElements(factored.result[1].condition, typeEnvironment)
    if (condition?.length === 1 && condition[0].type === 'atom' && condition[0].value === 'true') {
        return undefined
    }
    return condition
}

/** A table's title the way `mapLabel` is a map's: stated if it says one, derived from it if not. */
export function tableLabel(uss: MapUSS, typeEnvironment: TypeEnvironment): HumanReadableName | undefined {
    const stated = statedTableTitle(uss, typeEnvironment)
    if (stated !== undefined) {
        return stated
    }
    const columns = tableColumnLabels(uss, typeEnvironment)
    return columns === undefined ? undefined : deriveTableLabel(uss, typeEnvironment, columns)
}

export function deriveTableColumnLabel(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): HumanReadableName | undefined {
    const { ast: factored } = unitCheck(uss, typeEnvironment)
    const values = tableColumnExpression(factored, typeEnvironment, columnIndex)
    return values === undefined ? undefined : humanReadableElements(values, typeEnvironment)
}

const editableTableCall = mapUssParser(l.edit(l.call({
    fn: l.ignore(),
    namedArgs: {},
    unnamedArgs: [],
})), 'dont-reparse')

export function deriveTableLabel(uss: MapUSS, typeEnvironment: TypeEnvironment, columnNames: HumanReadableName[]): HumanReadableName | undefined {
    const { ast: factored } = unitCheck(uss, typeEnvironment)
    const result = read(editableTableCall, factored, typeEnvironment)
    if (result === undefined) {
        return undefined
    }
    // Replace the table call with just the column to simplify the label (we know it's a table)
    const withTableCallReplacedByDataLabel = result.edit({ type: 'constant', value: { node: { type: 'humanReadableElements', value: joinHumanReadableNames(columnNames) }, location: noLocation } })
    assert(withTableCallReplacedByDataLabel !== undefined, 'should not happen')
    return humanReadableElements((withTableCallReplacedByDataLabel), typeEnvironment)
}

/**
 * The elements followed by what the numbers behind them are counted in, as in "[in /km^{2}]". The
 * reader's units are not it: a logarithm is of the number a script computed with, whatever units
 * the reader has the same number written to them in. A count gets nothing, having no name.
 */
function inUnitWritten(written: HumanReadableElement[], unit: StoredUnit | undefined): HumanReadableElement[] {
    if (unit === undefined) return written
    const name = nameOfStoredUnit(unit)
    // A share is stored as the fraction it is, whatever percentage it is written as, and so is a
    // count of one thing per another: fatalities per capita are stored per person, not per 100k.
    const perSomething = unit.unit.dimensions.some(({ power }) => power < 0)
    if (unit.unit.decoration.kind === 'percent' || (name?.length === 0 && perSomething)) {
        return [...written, { type: 'atom', value: ' [as a fraction]' }]
    }
    if (name === undefined || name.length === 0) return written
    return [...written, { type: 'atom', value: ' [in ' }, ...name, { type: 'atom', value: ']' }]
}

function formatNumber(number: number, unit?: StoredUnit): HumanReadableElement[] {
    if (unit !== undefined) {
        return [{ type: 'quantity', value: number, unit }]
    }
    if (number >= 1e4) {
        const { number: written, suffix } = abbreviate(number)
        return [{ type: 'atom', value: `${trimTrailingZeros(written)}${suffix}` }]
    }
    else if (number !== 0 && Math.abs(number) < 1e-3) {
        const [mantissa, exponent] = number.toExponential(2).split('e')
        return [
            { type: 'atom', value: `${trimTrailingZeros(mantissa)}x10` },
            { type: 'superscript', value: [{ type: 'atom', value: String(Number(exponent)) }] },
        ]
    }
    else if (Number.isInteger(number)) {
        return [{ type: 'atom', value: separateNumber(number.toFixed(0)) }]
    }
    else {
        return [{ type: 'atom', value: trimTrailingZeros(formatToSignificantFigures(number)) }]
    }
}
