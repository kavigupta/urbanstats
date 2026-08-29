import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit, writableDimensions } from '../utils/quantity'

import { UrbanStatsASTExpression } from './ast'
import { TypeEnvironment } from './types-values'
import { unitToWriteIn } from './unit-algebra'
import { inferBindings, inferUnit } from './unit-inference'

/** A unit read off the script, or what stopped it being read. */
export type DerivedUnit = { unit: StoredUnit } | { problem: string }

/** Read against the whole script, so that a name the script assigned is followed. */
function unitOf(values: UrbanStatsASTExpression | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment): DerivedUnit {
    if (values === undefined) {
        return { problem: 'its values are not written as an expression the units can be read from' }
    }
    const known = inferUnit(values, typeEnvironment, inferBindings(uss, typeEnvironment))
    if (known.kind === 'any') {
        return { problem: 'nothing in the script says what its values are measured in' }
    }
    if (known.kind === 'none') {
        return { problem: 'its values put together quantities that are not in the same unit' }
    }
    if (unitToWriteIn(known) === undefined) {
        return { problem: 'its values are neither readings nor differences of readings, so a scale with no zero of its own cannot be written' }
    }
    if (!writableDimensions(known.unit.unit)) {
        return {
            problem: known.unit.unit.dimensions.some(({ power }) => !Number.isInteger(power))
                ? 'a fractional power of a unit is in no units anybody writes'
                : 'a count of one thing times another has no name of its own',
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

/** The unit where one was read, for a caller with nothing to say about why there is none. */
export function unitOrNothing(derived: DerivedUnit): StoredUnit | undefined {
    return 'unit' in derived ? derived.unit : undefined
}
