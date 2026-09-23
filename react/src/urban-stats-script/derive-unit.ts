import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { HumanReadableName } from '../utils/human-readable-element'
import { StoredUnit } from '../utils/quantity'
import { UnitType, unitTypeToStoredUnit } from '../utils/unit'

import { constructDeclaredUnitsForTable, constructDeclaredUnitsForMap } from './declared-units'
import { mapLabelOf, tableColumnNameOf } from './derive-human-readable-name'
import { TypeEnvironment } from './types-values'
import { unitCheck } from './unit-inference'

/**
 * The unit comes from `unit=`, or the data if unset. Both come from one reading of the script, so the
 * label mentions any conversion `unit=` causes.
 */
export function mapRampUnitAndLabel(uss: MapUSS, typeEnvironment: TypeEnvironment, userProvided: UnitType | undefined): { unit: StoredUnit | undefined, label: HumanReadableName | undefined } {
    const factored = unitCheck(uss, typeEnvironment, constructDeclaredUnitsForMap(uss, typeEnvironment, userProvided))
    return {
        unit: userProvided === undefined
            ? mapDataExpression(factored, typeEnvironment)?.computesTo
            : unitTypeToStoredUnit(userProvided),
        label: mapLabelOf(factored, typeEnvironment),
    }
}

/** The same for one column of a table, whose name is what a map calls its label. */
export function tableColumnUnitAndName(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number, userProvided: UnitType | undefined): { unit: StoredUnit | undefined, name: HumanReadableName | undefined } {
    const declared = constructDeclaredUnitsForTable(uss, typeEnvironment, onlyColumn(columnIndex, userProvided))
    const factored = unitCheck(uss, typeEnvironment, declared)
    return {
        unit: userProvided === undefined
            ? tableColumnExpression(factored, typeEnvironment, columnIndex)?.computesTo
            : unitTypeToStoredUnit(userProvided),
        name: tableColumnNameOf(factored, typeEnvironment, columnIndex),
    }
}

/** Declares only one column, which is safe since a column's unit depends only on its own values. */
function onlyColumn(columnIndex: number, unit: UnitType | undefined): (UnitType | undefined)[] {
    const units = new Array<UnitType | undefined>(columnIndex + 1).fill(undefined)
    units[columnIndex] = unit
    return units
}
