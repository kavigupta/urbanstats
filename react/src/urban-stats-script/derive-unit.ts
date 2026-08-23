import { MapUSS, mapUssParser } from '../mapper/settings/map-uss'
import { StoredUnit, writableDimensions } from '../utils/quantity'

import { UrbanStatsASTExpression } from './ast'
import * as l from './literal-parser'
import { TypeEnvironment } from './types-values'
import { unitToWriteIn } from './unit-algebra'
import { inferBindings, inferUnit } from './unit-inference'

/** A script shaped otherwise than the schema reads says nothing, as it says no label either. */
function read<T>(schema: () => T): T | undefined {
    try {
        return schema()
    }
    catch (error) {
        if (error instanceof l.LiteralParseError) {
            return undefined
        }
        throw error
    }
}

/** Read against the whole script, so that an expression naming what the script worked out is followed. */
function unitOf(values: UrbanStatsASTExpression | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    if (values === undefined) {
        return undefined
    }
    const unit = unitToWriteIn(inferUnit(values, typeEnvironment, inferBindings(uss, typeEnvironment)))
    return unit !== undefined && writableDimensions(unit.unit.dimensions) ? unit : undefined
}

/** What a map is of, where the script it was drawn from did not say. */
export function deriveMapUnit(uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    const schema = mapUssParser(l.call({
        fn: l.ignore(),
        namedArgs: { data: l.passthrough() },
        unnamedArgs: [],
    }), 'dont-reparse')
    return read(() => unitOf(schema(uss, typeEnvironment).namedArgs.data, uss, typeEnvironment))
}

/** What a column of a table is of, where the table did not say. */
export function deriveTableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): StoredUnit | undefined {
    const schema = mapUssParser(l.call({
        fn: l.ignore(),
        namedArgs: {
            columns: l.vector(l.call({
                fn: l.ignore(),
                namedArgs: { values: l.passthrough() },
                unnamedArgs: [],
            })),
        },
        unnamedArgs: [],
    }), 'dont-reparse')
    return read(() => {
        const columns = schema(uss, typeEnvironment).namedArgs.columns
        return columnIndex < columns.length ? unitOf(columns[columnIndex].namedArgs.values, uss, typeEnvironment) : undefined
    })
}
