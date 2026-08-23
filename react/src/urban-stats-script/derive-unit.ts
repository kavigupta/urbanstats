import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit, writableDimensions } from '../utils/quantity'

import { UrbanStatsASTExpression } from './ast'
import { TypeEnvironment } from './types-values'
import { unitToWriteIn } from './unit-algebra'
import { inferBindings, inferUnit } from './unit-inference'

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
    return unitOf(mapDataExpression(uss, typeEnvironment), uss, typeEnvironment)
}

/** What a column of a table is of, where the table did not say. */
export function deriveTableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): StoredUnit | undefined {
    return unitOf(tableColumnExpression(uss, typeEnvironment, columnIndex), uss, typeEnvironment)
}
