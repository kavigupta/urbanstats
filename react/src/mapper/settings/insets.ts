import { EditMultipleInsets, Inset } from '../../components/map'
import { Universe } from '../../universe'
import { UrbanStatsASTArg, UrbanStatsASTExpression } from '../../urban-stats-script/ast'
import { deconstruct } from '../../urban-stats-script/constants/insets'
import { noLocation } from '../../urban-stats-script/location'
import { hasCustomNode, parseNoErrorAsExpression, unparse } from '../../urban-stats-script/parser'
import { TypeEnvironment } from '../../urban-stats-script/types-values'
import { loadInsetExpression } from '../../urban-stats-script/worker'
import { assert } from '../../utils/defensive'

import { parseExpr } from './AutoUXEditor'
import { idOutput, MapUSS, validMapperOutputs } from './TopLevelEditor'
import { MapSettings } from './utils'

export function canEditInsets(settings: MapSettings, typeEnvironment: TypeEnvironment):
    { result: true, edit: (newArgVal: UrbanStatsASTExpression) => MapUSS, insets: Inset[] }
    | { result: false } {
    const uss = settings.script.uss
    let mapConstructorCall, insetsArg
    if (
        uss.type === 'statements'
        && (mapConstructorCall = uss.result[1].rest[0].value)
        && mapConstructorCall.type === 'call'
        && ((insetsArg = mapConstructorCall.args.find(arg => arg.type === 'named' && arg.name.node === 'insets')) || true)
        && (insetsArg === undefined || !hasCustomNode(insetsArg))
    ) {
        const resolvedCall = mapConstructorCall
        const resolvedInsetsArg = insetsArg
        const edit = (newArgVal: UrbanStatsASTExpression): MapUSS => {
            return {
                ...uss,
                result: [
                    uss.result[0],
                    {
                        ...uss.result[1],
                        rest: [
                            {
                                ...uss.result[1].rest[0],
                                value: parseExpr({
                                    ...resolvedCall,
                                    args: [...resolvedCall.args.filter(arg => arg !== resolvedInsetsArg), { type: 'named', name: { location: noLocation, node: 'insets' }, value: newArgVal }],
                                }, idOutput, validMapperOutputs, typeEnvironment, () => { throw new Error('should not happen') }, true),
                            },
                        ],
                    },
                ],
            }
        }
        if (insetsArg === undefined) {
            if (settings.universe === undefined) {
                return { result: false }
            }
            return { result: true, edit, insets: getInsets(loadInsetExpression(settings.universe), typeEnvironment) }
        }
        return { result: true, edit, arg: { present: true, insets: getInsets(resolvedInsetsArg.va) } }
    }
    return { result: false }
}

export type InsetEdits = ReadonlyMap<number, Partial<Inset>>

export function doEditInsets(settings: MapSettings, newInsets: Inset[], typeEnvironment: TypeEnvironment): MapUSS {
    const canEdit = canEditInsets(settings, typeEnvironment)
    assert(canEdit.result, 'Trying to do an inset edit on USS that should not be inset editable')

    let arg: UrbanStatsASTExpression
    if (!canEdit.arg.present) {
        arg = loadInsetExpression(canEdit.arg.universe)
    }
    else {
        arg = canEdit.arg.value
    }

    // Edit the specified index (maybe need to deconstruct it first)
    assert(arg.type === 'call' && arg.args[0].value.type === 'vectorLiteral', 'Unexpected inset arg structure')
    return canEdit.edit(
        {
            ...arg,
            args: [
                {
                    ...arg.args[0],
                    value: Array.from(edits).reduce((vec, edit) => editInsetsList(vec, edit, typeEnvironment), arg.args[0].value),
                },
            ],
        })
}

function editInsetsList(
    vec: UrbanStatsASTExpression & { type: 'vectorLiteral' },
    [index, edit]: Parameters<EditMultipleInsets>,
    typeEnvironment: TypeEnvironment,
): UrbanStatsASTExpression & { type: 'vectorLiteral' } {
    assert(!hasCustomNode(vec), 'Cannot edit an insets list with custom nodes')

    const elem = vec.elements[index]

    const inset = getInset(elem, typeEnvironment)

    const newInset = {
        ...inset,
        ...edit,
    }

    const newAst = deconstruct(newInset)

    return {
        ...vec,
        elements: [...vec.elements.slice(0, index), newAst, ...vec.elements.slice(index + 1)],
    }
}

function getInsets(expr: UrbanStatsASTExpression, typeEnvironment: TypeEnvironment): Inset[] {
    return getVector(expr, elem => getInset(elem, typeEnvironment))
}

function getVector<T>(expr: UrbanStatsASTExpression, parseValue: (value: UrbanStatsASTExpression) => T): T[] {
    assert(expr.type === 'vectorLiteral', 'expression must be vector literal')
    return expr.elements.map(parseValue)
}

function getInset(expr: UrbanStatsASTExpression, typeEnvironment: TypeEnvironment): Inset {
    let constructInset

    switch (expr.type) {
        case 'identifier':
            const type = typeEnvironment.get(expr.name.node)
            if (type === undefined) {
                throw new Error(`Inset identifier ${expr.name.node} not found in type environment`)
            }
            if (type.documentation?.equivalentExpressions === undefined || type.documentation.equivalentExpressions.length === 0) {
                throw new Error(`Inset identifier ${expr.name.node} has no equivalent expressions`)
            }
            constructInset = parseNoErrorAsExpression(unparse(type.documentation.equivalentExpressions[0]), '')
            break
        case 'call':
            constructInset = expr
            break
        default:
            throw new Error(`Unexpected elem type ${expr.type}`)
    }

    assert(constructInset.type === 'call' && constructInset.fn.type === 'identifier' && constructInset.fn.name.node === 'constructInset', 'Must be a constructInset function call')

    const screenBounds = getArg(constructInset.args, 'screenBounds', getNESW)
    const mapBounds = getArg(constructInset.args, 'mapBounds', getNESW)
    const mainMap = getArg(constructInset.args, 'mainMap', getBoolean)
    const name = getArg(constructInset.args, 'name', getString)

    const inset: Inset = {
        bottomLeft: [screenBounds.west, screenBounds.south],
        topRight: [screenBounds.east, screenBounds.north],
        coordBox: [mapBounds.west, mapBounds.south, mapBounds.east, mapBounds.north],
        mainMap,
        name,
    }

    return inset
}

function getArg<T>(args: UrbanStatsASTArg[], argName: string, parseValue: (value: UrbanStatsASTExpression) => T): T {
    const arg = args.find(a => a.type === 'named' && a.name.node === argName)
    if (!arg) {
        throw new Error(`Couldn't find arg named ${argName}`)
    }
    return parseValue(arg.value)
}

function getNESW(expr: UrbanStatsASTExpression): { north: number, east: number, south: number, west: number } {
    assert(expr.type === 'objectLiteral', 'not object')

    const props = Object.fromEntries(expr.properties)

    assert('north' in props && 'east' in props && 'south' in props && 'west' in props, 'Props missing one of north east south west')

    return {
        north: getNumber(props.north),
        east: getNumber(props.east),
        south: getNumber(props.south),
        west: getNumber(props.west),
    }
}

function getNumber(expr: UrbanStatsASTExpression): number {
    if (expr.type === 'unaryOperator' && expr.operator.node === '-') {
        return -getNumber(expr.expr)
    }
    assert(expr.type === 'constant' && expr.value.node.type === 'number', 'must be a number')
    return expr.value.node.value
}

function getBoolean(expr: UrbanStatsASTExpression): boolean {
    assert(expr.type === 'identifier' && ['true', 'false'].includes(expr.name.node), 'must be true or false')
    return expr.name.node === 'true'
}

function getString(expr: UrbanStatsASTExpression): string {
    assert(expr.type === 'constant' && expr.value.node.type === 'string', 'Not a string constant')
    return expr.value.node.value
}
