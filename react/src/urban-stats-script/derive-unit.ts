import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit, writableDimensions } from '../utils/quantity'

import { UrbanStatsASTExpression } from './ast'
import { TypeEnvironment } from './types-values'
import { unitToWriteIn } from './unit-algebra'
import { inferBindings, inferUnit } from './unit-inference'

/** A unit read off the script, or why it could not be. */
export type DerivedUnit = { unit: StoredUnit } | { problem: string }

/** Read against the whole script, so that a name the script assigned is followed. */
function unitOf(values: UrbanStatsASTExpression | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment): DerivedUnit {
    if (values === undefined) {
        return { problem: 'its values are not an expression a unit can be read from' }
    }
    const known = inferUnit(values, typeEnvironment, inferBindings(uss, typeEnvironment))
    if (known.kind === 'any') {
        return { problem: 'no unit is known for its values' }
    }
    if (known.kind === 'none') {
        return { problem: 'its values combine different units' }
    }
    if (unitToWriteIn(known) === undefined) {
        return { problem: 'its values are neither readings nor differences of readings' }
    }
    if (!writableDimensions(known.unit.unit)) {
        return {
            problem: known.unit.unit.dimensions.some(({ power }) => !Number.isInteger(power))
                ? 'its unit has a fractional power'
                : 'its unit is a count times another unit',
        }
    }
    return { unit: known.unit }
}

export function deriveMapUnit(uss: MapUSS, typeEnvironment: TypeEnvironment): DerivedUnit {
    return unitOf(mapDataExpression(uss, typeEnvironment), uss, typeEnvironment)
}

export function deriveTableColumnUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, columnIndex: number): DerivedUnit {
    return unitOf(tableColumnExpression(uss, typeEnvironment, columnIndex), uss, typeEnvironment)
}

/** The unit, for a caller that does not report why there is none. */
export function unitOrNothing(derived: DerivedUnit): StoredUnit | undefined {
    return 'unit' in derived ? derived.unit : undefined
}
