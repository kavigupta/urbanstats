import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'

import { UrbanStatsASTExpression } from './ast'
import { unparse } from './parser'
import { TypeEnvironment } from './types-values'
import { unitToWriteIn } from './unit-algebra'
import { inferBindings, whyNoUnit, inferUnit } from './unit-inference'

/** A unit read off the script, or why it could not be. */
export type DerivedUnit = { unit: StoredUnit } | { problem: string }

/** Read against the whole script, so that a name the script assigned is followed. */
function unitOf(values: UrbanStatsASTExpression | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment): DerivedUnit {
    if (values === undefined) {
        return { problem: 'its values are not an expression a unit can be read from' }
    }
    const scope = { typeEnvironment, named: inferBindings(uss, typeEnvironment) }
    const wrong = whyNoUnit(values, scope)
    if (wrong === undefined) {
        return { unit: unitToWriteIn(inferUnit(values, typeEnvironment, scope.named))! }
    }
    return { problem: `${wrong.problem}, in ${unparse(wrong.at, { inline: true, expressionalContext: true })}` }
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
