import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'

import { UrbanStatsASTExpression } from './ast'
import { TypeEnvironment } from './types-values'
import { unitToWriteIn } from './unit-algebra'
import { inferBindings, inferConstantUnits, inferUnit } from './unit-inference'

/**
 * Read against the whole script, so that a name the script assigned is followed, and against what
 * the backward pass made of its literals, so that a * 1 is read in whatever unit makes the rest
 * work, as the caption writes it.
 */
function unitOf(values: UrbanStatsASTExpression | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    if (values === undefined) {
        return undefined
    }
    const named = inferBindings(uss, typeEnvironment)
    return unitToWriteIn(inferUnit(values, typeEnvironment, named, inferConstantUnits(uss, typeEnvironment)))
}

export function deriveMapUnit(uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    return unitOf(mapDataExpression(uss, typeEnvironment), uss, typeEnvironment)
}

export function deriveTableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): StoredUnit | undefined {
    return unitOf(tableColumnExpression(uss, typeEnvironment, columnIndex), uss, typeEnvironment)
}
