import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'

import { UrbanStatsASTExpression } from './ast'
import { TypeEnvironment } from './types-values'
import { unitToWriteIn } from './unit-algebra'
import { unitCheck, unitWithin } from './unit-inference'

/**
 * Read against the whole script, so that a name the script assigned is followed and a factor the
 * units wanted is written in, and then read again for the one expression the map or column draws.
 */
function unitOf(of: (checked: MapUSS) => UrbanStatsASTExpression | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    const checked = unitCheck(uss, typeEnvironment)
    const values = of(checked.ast)
    if (values === undefined) {
        return undefined
    }
    return unitToWriteIn(unitWithin(values, typeEnvironment, checked.named, checked.literals))
}

export function deriveMapUnit(uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    return unitOf(checked => mapDataExpression(checked, typeEnvironment), uss, typeEnvironment)
}

export function deriveTableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): StoredUnit | undefined {
    return unitOf(checked => tableColumnExpression(checked, typeEnvironment, columnIndex), uss, typeEnvironment)
}
