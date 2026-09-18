import { mapDataExpression, MapUSS, plotPanelExpressions, tableColumnExpression } from '../mapper/settings/map-uss'
import { HumanReadableName } from '../utils/human-readable-element'
import { StoredUnit } from '../utils/quantity'
import { UnitType, unitTypeToStoredUnit } from '../utils/unit'

import { UrbanStatsASTExpression } from './ast'
import { constructDeclaredUnitsForTable, constructDeclaredUnitsForMap } from './declared-units'
import { mapLabelOf, nameOfExpression, tableColumnNameOf } from './derive-human-readable-name'
import { TypeEnvironment } from './types-values'
import { UnitInferenceMetadata, unitCheck } from './unit-inference'

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

/** What to call each panel's axes, and what they are read in, where the script does not say. */
export interface AxisNaming {
    x: { name: HumanReadableName | undefined, unit: StoredUnit | undefined }
    y: { name: HumanReadableName | undefined, unit: StoredUnit | undefined }
    /** What a colourbar reads off, which is neither axis. */
    color: { name: HumanReadableName | undefined, unit: StoredUnit | undefined }
}

/**
 * A plot's axes named after the data drawn against them, panel by panel in the order they are
 * drawn — what a map does for its ramp, for every axis of every panel at once.
 */
export function plotAxisNaming(uss: MapUSS, typeEnvironment: TypeEnvironment): AxisNaming[] {
    const factored = unitCheck(uss, typeEnvironment)
    return plotPanelExpressions(factored, typeEnvironment).map(panel => ({
        x: nameAndUnit(panel.x, typeEnvironment),
        y: nameAndUnit(panel.y, typeEnvironment),
        color: nameAndUnit(panel.color, typeEnvironment),
    }))
}

function nameAndUnit(
    expr: UrbanStatsASTExpression<UnitInferenceMetadata> | undefined,
    typeEnvironment: TypeEnvironment,
): { name: HumanReadableName | undefined, unit: StoredUnit | undefined } {
    if (expr === undefined) {
        return { name: undefined, unit: undefined }
    }
    return { name: nameOfExpression(expr, typeEnvironment), unit: expr.computesTo }
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
