import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'

import { UrbanStatsASTExpression } from './ast'
import { TypeEnvironment } from './types-values'
import { UnitsRead, unitCheck } from './unit-inference'

/** What the one expression a map or a column draws was read as being in. */
function unitOf(of: (checked: MapUSS<UnitsRead>) => UrbanStatsASTExpression<UnitsRead> | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    return of(unitCheck(uss, typeEnvironment))?.worksOutTo
}

export function deriveMapUnit(uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    return unitOf(checked => mapDataExpression(checked, typeEnvironment), uss, typeEnvironment)
}

export function deriveTableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): StoredUnit | undefined {
    return unitOf(checked => tableColumnExpression(checked, typeEnvironment, columnIndex), uss, typeEnvironment)
}
