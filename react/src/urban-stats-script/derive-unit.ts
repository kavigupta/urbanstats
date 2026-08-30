import { mapDataExpression, MapUSS, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'

import { locationOf, UrbanStatsASTExpression, UrbanStatsASTStatement } from './ast'
import { LocInfo, noLocation } from './location'
import { unparse } from './parser'
import { TypeEnvironment } from './types-values'
import { unitToWriteIn } from './unit-algebra'
import { inferBindings, inferUnit, whyNoUnit, whyUnitsClash } from './unit-inference'

/** A unit read off the script, or what to say about there being none, and where to say it. */
export type DerivedUnit = { unit: StoredUnit } | { problem: string, location: LocInfo }

/** Read against the whole script, so that a name the script assigned is followed. */
function unitOf(values: UrbanStatsASTExpression | undefined, uss: MapUSS, typeEnvironment: TypeEnvironment): DerivedUnit {
    if (values === undefined) {
        return { problem: 'Could not compute units: the values are not an expression a unit can be read from', location: noLocation }
    }
    const scope = { typeEnvironment, named: inferBindings(uss, typeEnvironment) }
    const wrong = whyNoUnit(values, scope)
    if (wrong === undefined) {
        return { unit: unitToWriteIn(inferUnit(values, typeEnvironment, scope.named))! }
    }
    return describeProblem(wrong)
}

function describeProblem(wrong: { at: UrbanStatsASTExpression | UrbanStatsASTStatement, problem: string }): { problem: string, location: LocInfo } {
    return {
        // simplified, so that what the editor wrapped in a customNode reads as what was written
        problem: `Could not compute units for ${unparse(wrong.at, { inline: true, expressionalContext: true, simplify: 'auto-ux' })}: ${wrong.problem}`,
        location: locationOf(wrong.at),
    }
}

/**
 * What in a script does not go together, wherever it is written: a condition comparing a number
 * against a time says nothing about what anything is measured in, so nothing else would report it.
 */
export function scriptUnitProblem(uss: MapUSS, typeEnvironment: TypeEnvironment): { problem: string, location: LocInfo } | undefined {
    const scope = { typeEnvironment, named: inferBindings(uss, typeEnvironment) }
    const wrong = whyUnitsClash(uss, scope)
    return wrong === undefined ? undefined : describeProblem(wrong)
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
