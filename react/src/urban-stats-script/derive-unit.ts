import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'
import { UnitType, unitTypeToStoredUnit } from '../utils/unit'

import { UrbanStatsASTExpression } from './ast'
import { TypeEnvironment } from './types-values'
import { unitToWriteIn } from './unit-algebra'
import { inferBindings, inferUnit } from './unit-inference'

/** Read against the whole script, so that a name the script assigned is followed. */
function unitOf(values: UrbanStatsASTExpression | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    if (values === undefined) {
        return undefined
    }
    return unitToWriteIn(inferUnit(values, typeEnvironment, inferBindings(uss, typeEnvironment)))
}

export function deriveMapUnit(uss: MapUSS, typeEnvironment: TypeEnvironment): StoredUnit | undefined {
    return unitOf(mapDataExpression(uss, typeEnvironment), uss, typeEnvironment)
}

export function deriveTableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): StoredUnit | undefined {
    return unitOf(tableColumnExpression(uss, typeEnvironment, columnIndex), uss, typeEnvironment)
}

/**
 * The unit a map's ramp is labelled in: the one the user provided through the map's `unit=`
 * argument, or where they provided none, the one derived from the script. The provided unit is the
 * evaluated one, so a name bound to a unit works as well as a unit written out.
 *
 * Both the mapper and the link embed card label a ramp, and they have to agree on this.
 */
export function mapRampUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, userProvided: UnitType | undefined): StoredUnit | undefined {
    return userProvided === undefined ? deriveMapUnit(uss, typeEnvironment) : unitTypeToStoredUnit(userProvided)
}
