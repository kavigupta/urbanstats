import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'

import { UrbanStatsASTExpression } from './ast'
import { TypeEnvironment } from './types-values'
import { unitToWriteIn } from './unit-algebra'
import { UnitsRead, unitCheck, unitWithin } from './unit-inference'

/**
 * Checks the whole script first, so that the names it binds are known, then reads the unit from
 * the one expression the map or column draws.
 */
function unitOf(of: (checked: MapUSS<UnitsRead>) => UrbanStatsASTExpression<UnitsRead> | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    const checked = unitCheck(uss, typeEnvironment)
    const values = of(checked.ast)
    if (values === undefined) {
        return undefined
    }
    return unitToWriteIn(unitWithin(values, typeEnvironment, checked.named))
}

export function deriveMapUnit(uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    return unitOf(checked => mapDataExpression(checked, typeEnvironment), uss, typeEnvironment)
}

export function deriveTableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): StoredUnit | undefined {
    return unitOf(checked => tableColumnExpression(checked, typeEnvironment, columnIndex), uss, typeEnvironment)
}
