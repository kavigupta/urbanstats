import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'
import { UnitType, unitTypeToStoredUnit } from '../utils/unit'

import { UrbanStatsASTExpression } from './ast'
import { assignDeclaredMapUnit, DeclaredUnits } from './declared-units'
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
 * What a map is drawn in, and what to tell unit inference about it: the unit the map declared, or
 * where it declared none, whatever its script works out to. Both the app and the link embed card
 * ask this, and a card that answered it differently would be labelled differently.
 */
export function mapIsDrawnIn(uss: MapUSS, typeEnvironment: TypeEnvironment, declared: UnitType | undefined): { declaredUnits: DeclaredUnits, unit: StoredUnit | undefined } {
    const declaredUnits = assignDeclaredMapUnit(uss, typeEnvironment, declared)
    return {
        declaredUnits,
        unit: declared === undefined ? deriveMapUnit(uss, typeEnvironment, declaredUnits) : unitTypeToStoredUnit(declared),
    }
}
