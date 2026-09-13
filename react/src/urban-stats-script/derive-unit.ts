import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { HumanReadableName } from '../utils/human-readable-element'
import { StoredUnit } from '../utils/quantity'
import { UnitType, unitTypeToStoredUnit } from '../utils/unit'

import { constructDeclaredUnitsForTable, constructDeclaredUnitsForMap } from './declared-units'
import { mapLabelOf, tableColumnNameOf } from './derive-human-readable-name'
import { TypeEnvironment } from './types-values'
import { unitCheck } from './unit-inference'

/**
 * How to label a map's ramp: the unit it is written in, and the name of what it draws. The unit is
 * the one the user chose through the map's `unit=` argument, or where they chose none, the one the
 * data works out to.
 *
 * Both come out of a single reading of the script, and that reading is told what the user chose,
 * which is how the name comes to mention any conversion that choice caused.
 *
 * The mapper and the link embed card both label a ramp, and they have to agree on this.
 */
export function mapRampUnitAndLabel(uss: MapUSS, typeEnvironment: TypeEnvironment, userProvided: UnitType | undefined): { unit: StoredUnit | undefined, label: HumanReadableName | undefined } {
    const factored = unitCheck(uss, typeEnvironment, constructDeclaredUnitsForMap(uss, typeEnvironment, userProvided))
    return {
        unit: userProvided === undefined
            ? mapDataExpression(factored, typeEnvironment)?.worksOutTo
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
            ? tableColumnExpression(factored, typeEnvironment, columnIndex)?.worksOutTo
            : unitTypeToStoredUnit(userProvided),
        name: tableColumnNameOf(factored, typeEnvironment, columnIndex),
    }
}

/**
 * One column's unit, in the shape a whole table's declarations take. Saying nothing of the other
 * columns is safe: a column's name and unit are read off its own values and no other's.
 */
function onlyColumn(columnIndex: number, unit: UnitType | undefined): (UnitType | undefined)[] {
    const units = new Array<UnitType | undefined>(columnIndex + 1).fill(undefined)
    units[columnIndex] = unit
    return units
}
