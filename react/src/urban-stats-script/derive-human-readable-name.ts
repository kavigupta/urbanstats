import { editableMapData, MapUSS, mapUssParser, read, tableColumnExpression } from '../mapper/settings/map-uss'
import { assert } from '../utils/defensive'
import { HumanReadableElement, HumanReadableName } from '../utils/human-readable-element'
import { joinHumanReadableNames } from '../utils/human-readable-name'
import { parseHumanReadableTemplate } from '../utils/human-readable-template'
import { asADifference, isPlainNumber, multiplies, nameOfStoredUnit, sameDimensions, sameSize, StoredUnit, unitProduct } from '../utils/quantity'
import { abbreviate, formatToSignificantFigures, separateNumber, trimTrailingZeros } from '../utils/text'

import { UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import * as l from './literal-parser'
import { noLocation } from './location'
import { BinaryOperatorSymbol, expressionOperatorMap } from './operators'
import { TypeEnvironment } from './types-values'
import { UnitConversion, UnitsRead, unitCheck, unitWithin } from './unit-inference'

type Expression = UrbanStatsASTExpression<UnitsRead>

function humanReadableElements(ast: Expression | UrbanStatsASTStatement<UnitsRead>, typeEnvironment: TypeEnvironment): HumanReadableElement[] | undefined {
    const written = describe(ast, typeEnvironment)
    if (written === undefined) {
        return undefined
    }
    // a constant writes its unit into the number itself, as "1 000/km^2"
    if (ast.converted === undefined || ast.type === 'constant') {
        return written
    }
    return howConverted(written, ast.converted, isAtomic(ast))
}

/**
 * Whether this renders as an unambiguous atom, needing no parentheses. Powers are unique among the
 * operators in that they render as superscripts.
 */
function isAtomic(ast: Expression | UrbanStatsASTStatement<UnitsRead>): boolean {
    return ast.type !== 'binaryOperator' || ast.operator.node === '**'
}

/** The operator an expression prints as. One that says what unit it is in prints bracketed. */
function printsAsOperation(ast: Expression): typeof expressionOperatorMap[BinaryOperatorSymbol] | undefined {
    if (ast.converted !== undefined) {
        const runsAs = conversionRunsAs(ast.converted)
        return runsAs === undefined ? undefined : expressionOperatorMap[runsAs]
    }
    if (ast.type !== 'binaryOperator' || isAtomic(ast)) {
        return undefined
    }
    return expressionOperatorMap[ast.operator.node]
}

function describe(ast: Expression | UrbanStatsASTStatement<UnitsRead>, typeEnvironment: TypeEnvironment): HumanReadableElement[] | undefined {
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
            const leftOp = printsAsOperation(ast.left)
            if (leftOp !== undefined && !(leftOp.precedence > centerOp.precedence || leftOp === centerOp)) {
                lhs = [{ type: 'parens', value: lhs }]
            }

            let rhs = humanReadableElements(ast.right, typeEnvironment)
            if (rhs === undefined) return
            const rightOp = printsAsOperation(ast.right)
            if (rightOp !== undefined && !(rightOp.precedence > centerOp.precedence || (centerOp === rightOp && centerOp.isAssociative))) {
                rhs = [{ type: 'parens', value: rhs }]
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
                    return formatNumber(ast.value.node.value, ast.converted?.expectedUnit)
                case 'string':
                    return [{ type: 'atom', value: ast.value.node.value }]
            }
        case 'unaryOperator': {
            const written = humanReadableElements(ast.expr, typeEnvironment)
            if (written === undefined) return
            // a sign binds tighter than adding, so -(a + b) would otherwise read as -a + b, which
            // is a different number. It binds looser than multiplying, which needs no brackets.
            const inner = printsAsOperation(ast.expr)
            const operand: HumanReadableElement[] = inner !== undefined && inner.precedence < expressionOperatorMap['*'].precedence
                ? [{ type: 'parens', value: written }]
                : written
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

/** `expected` is the unit the map states, which the script is read as being converted into. */
export function deriveMapLabel(uss: MapUSS, typeEnvironment: TypeEnvironment, expected?: StoredUnit): HumanReadableName | undefined {
    const checked = unitCheck(uss, typeEnvironment)
    const result = read(editableMapData<UnitsRead>(), checked.ast, typeEnvironment)
    if (result?.currentValue.namedArgs.data === undefined) return
    const data = unitWithin(result.currentValue.namedArgs.data, typeEnvironment, checked.named, expected).ast
    const dataLabel = humanReadableElements(data, typeEnvironment)
    if (dataLabel === undefined) return
    // Replace the map call with just the data description to simplify the label (we know it's a map)
    const withMapCallReplacedByDataLabel = result.edit({ type: 'constant', value: { node: { type: 'humanReadableElements', value: grouped(dataLabel) }, location: noLocation } })
    assert(withMapCallReplacedByDataLabel !== undefined, 'should not happen')
    const label = humanReadableElements(withMapCallReplacedByDataLabel, typeEnvironment)
    return label === undefined ? undefined : ungroupUnlessWorthwhile(label, dataLabel, 1)
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
const statedColumnNames = mapUssParser<{ namedArgs: { columns: { namedArgs: { values: Expression | undefined, name: string | undefined } }[] } }, UnitsRead>(l.call({
    fn: l.ignore(),
    namedArgs: {
        columns: l.vector(l.call({
            fn: l.ignore(),
            namedArgs: {
                values: l.passthrough<UnitsRead>(),
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
        return column.namedArgs.values === undefined ? undefined : humanReadableElements(column.namedArgs.values, typeEnvironment)
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

/** `expected` is the unit the column states, which the script is read as being converted into. */
export function deriveTableColumnLabel(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number, expected?: StoredUnit): HumanReadableName | undefined {
    const checked = unitCheck(uss, typeEnvironment)
    const values = tableColumnExpression(checked.ast, typeEnvironment, columnIndex)
    if (values === undefined) {
        return undefined
    }
    return humanReadableElements(unitWithin(values, typeEnvironment, checked.named, expected).ast, typeEnvironment)
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
    const columns = joinHumanReadableNames(columnNames)
    // Replace the table call with just the column to simplify the label (we know it's a table)
    const withTableCallReplacedByDataLabel = result.edit({ type: 'constant', value: { node: { type: 'humanReadableElements', value: grouped(columns) }, location: noLocation } })
    assert(withTableCallReplacedByDataLabel !== undefined, 'should not happen')
    const label = humanReadableElements(withTableCallReplacedByDataLabel, typeEnvironment)
    return label === undefined ? undefined : ungroupUnlessWorthwhile(label, columns, columnNames.length)
}

/**
 * A label is substituted into the script inside parens, so that a filter the label itself carries
 * is not at the end for the script's own filter to consolidate with.
 */
function grouped(label: HumanReadableElement[]): HumanReadableElement[] {
    return [{ type: 'parens', value: label }]
}

/**
 * The parentheses are worth their noise only where something follows the label, and either it is a
 * list or it carries a filter that what follows would otherwise run into.
 */
function ungroupUnlessWorthwhile(label: HumanReadableElement[], substituted: HumanReadableElement[], parts: number): HumanReadableElement[] {
    const worthwhile = label.length > 1 && (parts > 1 || substituted.some(element => element.type === 'where'))
    if (worthwhile || label[0]?.type !== 'parens') {
        return label
    }
    return [...label[0].value, ...label.slice(1)]
}

/**
 * Writes out a conversion. Three forms, by what is being converted:
 *
 *     an area read as a plain number      Area [in km^2]
 *     a plain number read as an area      Names [as km^2]
 *     people read as an area              Population x 1km^2/person
 *
 * A reading does not scale, so its zero is subtracted first: "(Mean high temp - 0F) x Area".
 */
function howConverted(written: HumanReadableElement[], conversion: UnitConversion, atomic: boolean): HumanReadableElement[] {
    const { internalUnit } = conversion
    const parts = conversionParts(conversion)
    // the conversion is of the whole expression, so "(A + B) [in U]" needs the brackets. They are
    // only worth writing where the conversion itself writes something.
    const bracketed = atomic ? written : [{ type: 'parens' as const, value: written }]
    if (parts === undefined) {
        const said = internalUnit === undefined
            ? unitSaid(conversion.expectedUnit, 'as')
            : unitSaid(internalUnit, 'in')
        return said === undefined ? written : [...bracketed, ...said]
    }
    // bracket the zero only where a factor follows, so that "x - 0 x 1F" does not misread
    const follows = parts.factor !== undefined || parts.zeroAdded !== undefined
    let writing = bracketed
    if (parts.zeroSubtracted !== undefined) {
        const less = [...bracketed, { type: 'atom' as const, value: ' \u2212 ' }, ...formatNumber(0, parts.zeroSubtracted)]
        writing = follows ? [{ type: 'parens', value: less }] : less
    }
    if (parts.factor !== undefined) {
        writing = [...writing, { type: 'atom', value: ' \u00d7 ' }, ...formatNumber(1, parts.factor)]
    }
    return parts.zeroAdded === undefined ? writing : [...writing, { type: 'atom', value: ' + ' }, ...formatNumber(0, parts.zeroAdded)]
}

/**
 * The three pieces a conversion can write, any of which may be absent: the zero subtracted from a
 * reading, the factor, and the zero added to make a reading. Nothing at all for a value read as a
 * plain number, which is written "[in U]" instead.
 */
function conversionParts({ internalUnit, expectedUnit }: UnitConversion): { zeroSubtracted?: StoredUnit, factor?: StoredUnit, zeroAdded?: StoredUnit } | undefined {
    if (internalUnit === undefined || isPlainNumber(expectedUnit)) {
        return undefined
    }
    const scales = multiplies(internalUnit.unit)
    const from = scales ? internalUnit : asADifference(internalUnit)
    const to = multiplies(expectedUnit.unit) ? expectedUnit : asADifference(expectedUnit)
    // a factor between two scales is a difference of them. Written as a reading it would use the
    // zero of the reader's scale: one degree per person would show as -17.2C/person, not 0.556
    const between = unitProduct(to, from, -1)
    const spansAZero = !internalUnit.unit.baseIsScalar || !expectedUnit.unit.baseIsScalar
    const factor = alike(to, from) || between === undefined ? undefined : (spansAZero ? asADifference(between) : between)
    return {
        ...scales ? {} : { zeroSubtracted: internalUnit },
        ...factor === undefined ? {} : { factor },
        ...expectedUnit.unit.times === 1 && !expectedUnit.unit.baseIsScalar ? { zeroAdded: expectedUnit } : {},
    }
}

/** The operator a conversion's writing ends on, which is what encloses it has to reckon with. */
function conversionRunsAs(conversion: UnitConversion): BinaryOperatorSymbol | undefined {
    const parts = conversionParts(conversion)
    if (parts?.zeroAdded !== undefined) return '+'
    if (parts?.factor !== undefined) return '*'
    return parts?.zeroSubtracted === undefined ? undefined : '-'
}

function alike(left: StoredUnit, right: StoredUnit): boolean {
    return sameDimensions(left, right) && sameSize(left.toBaseUnits, right.toBaseUnits)
}

/**
 * The "[in km^2]" or "[as km^2]" written after an expression, in the units the script computed
 * with rather than the ones its reader chose. Nothing where the unit has no name, as a count has
 * none.
 */
function unitSaid(unit: StoredUnit | undefined, preposition: 'in' | 'as'): HumanReadableElement[] | undefined {
    if (unit === undefined) return undefined
    const name = nameOfStoredUnit(unit)
    // A share is stored as the fraction it is, whatever percentage it is written as, and so is a
    // count of one thing per another: fatalities per capita are stored per person, not per 100k.
    const perSomething = unit.unit.dimensions.some(({ power }) => power < 0)
    if (unit.unit.decoration.kind === 'percent' || (name?.length === 0 && perSomething)) {
        return [{ type: 'atom', value: ' [as a fraction]' }]
    }
    if (name === undefined || name.length === 0) return undefined
    return [{ type: 'atom', value: ` [${preposition} ` }, ...name, { type: 'atom', value: ']' }]
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
