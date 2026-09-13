import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'
import { UnitType, unitTypeToStoredUnit } from '../utils/unit'

import { UrbanStatsASTExpression } from './ast'
import { DeclaredUnits, nothingDeclared } from './declared-units'
import { TypeEnvironment } from './types-values'
import { UnitsRead, unitCheck } from './unit-inference'

/** What the one expression a map or a column draws was read as being in. */
function unitOf(of: (checked: MapUSS<UnitsRead>) => UrbanStatsASTExpression<UnitsRead> | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment, declaredUnits: DeclaredUnits): StoredUnit | undefined {
    return of(unitCheck(uss, typeEnvironment, declaredUnits))?.worksOutTo
}

export function deriveMapUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, declaredUnits: DeclaredUnits): StoredUnit | undefined {
    return unitOf(checked => mapDataExpression(checked, typeEnvironment), uss, typeEnvironment, declaredUnits)
}

export function deriveTableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number, declaredUnits: DeclaredUnits): StoredUnit | undefined {
    return unitOf(checked => tableColumnExpression(checked, typeEnvironment, columnIndex), uss, typeEnvironment, declaredUnits)
}

/**
 * What a map's ramp is labelled in: the unit the user chose through the map's `unit=` argument, or
 * where they chose none, the unit derived from the data.
 *
 * Both the mapper and the link embed card label a ramp, and they have to agree on this.
 */
export function mapRampUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, userProvided: UnitType | undefined): StoredUnit | undefined {
    return userProvided === undefined
        ? deriveMapUnit(uss, typeEnvironment, nothingDeclared)
        : unitTypeToStoredUnit(userProvided)
}

/** What a table column is written in, chosen and derived the same way a map's ramp is. */
export function tableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number, userProvided: UnitType | undefined): StoredUnit | undefined {
    return userProvided === undefined
        ? deriveTableColumnUnit(uss, typeEnvironment, columnIndex, nothingDeclared)
        : unitTypeToStoredUnit(userProvided)
}
