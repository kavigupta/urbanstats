import { assert } from '../utils/defensive'

import { UrbanStatsASTArg, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { extendBlockIdVectorElement, LocInfo } from './location'
import { unparse } from './parser'

export type UrbanStatsASTExpressionCreator = (location: string | undefined) => UrbanStatsASTExpression
type UrbanStatsASTWithColumn = (colCreator: UrbanStatsASTExpressionCreator) => (UrbanStatsASTExpression | UrbanStatsASTStatement)

export function addColumn(uss: UrbanStatsASTExpression | UrbanStatsASTStatement): UrbanStatsASTWithColumn | undefined {
    switch (uss.type) {
        case 'customNode':
        {
            const addToSubExp = addColumn(uss.expr)
            if (addToSubExp === undefined) {
                return undefined
            }
            return (col: UrbanStatsASTExpressionCreator) => {
                const newExp = addToSubExp(col) as UrbanStatsASTStatement
                return {
                    type: 'customNode',
                    entireLoc: uss.entireLoc,
                    expr: newExp,
                    originalCode: unparse(newExp),
                    expectedType: uss.expectedType,
                }
            }
        }
        case 'statements':
        {
            if (uss.result.length === 0) {
                return undefined
            }
            const lastStatement = uss.result[uss.result.length - 1]
            const colAdder = addColumn(lastStatement)
            if (colAdder === undefined) {
                return undefined
            }
            return (col: UrbanStatsASTExpressionCreator) => {
                const newLastStatement = colAdder(col) as UrbanStatsASTStatement
                return {
                    ...uss,
                    result: [
                        ...uss.result.slice(0, uss.result.length - 1),
                        newLastStatement,
                    ],
                }
            }
        }
        case 'condition':
        {
            if (uss.rest.length === 0) {
                return undefined
            }
            const rest = addColumn(uss.rest[uss.rest.length - 1])
            if (rest === undefined) {
                return undefined
            }
            return (col: UrbanStatsASTExpressionCreator) => {
                return {
                    ...uss,
                    rest: [
                        ...uss.rest.slice(0, uss.rest.length - 1),
                        rest(col) as UrbanStatsASTStatement,
                    ],
                }
            }
        }
        case 'expression':
        {
            const adder = addColumn(uss.value)
            if (adder === undefined) {
                return undefined
            }
            return (col: UrbanStatsASTExpressionCreator) => {
                return {
                    ...uss,
                    value: adder(col) as UrbanStatsASTExpression,
                }
            }
        }
        case 'call':
        {
            const fn = uss.fn
            if (fn.type !== 'identifier' || fn.name.node !== 'table') {
                return undefined
            }
            const nameArgIdx = uss.args.findIndex(arg => arg.type === 'named' && arg.name.node === 'columns' && arg.value.type === 'vectorLiteral')
            if (nameArgIdx === -1) {
                return undefined
            }
            return (col: UrbanStatsASTExpressionCreator) => {
                const nameArg = uss.args[nameArgIdx] as UrbanStatsASTArg & { type: 'named' } & { value: { type: 'vectorLiteral', elements: UrbanStatsASTExpression[] } }
                const newNameArg = {
                    ...nameArg,
                    value: {
                        ...nameArg.value,
                        elements: [
                            ...nameArg.value.elements,
                            col(extend(nameArg.value.entireLoc, nameArg.value.elements.length)),
                        ],
                    },
                } satisfies UrbanStatsASTArg & { type: 'named' }
                return {
                    ...uss,
                    args: [
                        ...uss.args.slice(0, nameArgIdx),
                        newNameArg,
                        ...uss.args.slice(nameArgIdx + 1),
                    ],
                }
            }
        }
    }
    return undefined
}

function extend(loc: LocInfo, index: number): string | undefined {
    assert(JSON.stringify(loc.start.block) === JSON.stringify(loc.end.block), 'Cannot extend location across different blocks')
    if (loc.start.block.type === 'multi') {
        return undefined
    }
    const newBlockId = extendBlockIdVectorElement(loc.start.block.ident, index)
    return newBlockId
}
