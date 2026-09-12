import { mapDataExpression, MapUSS, mapUssParser, read, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'
import { UnitType, unitTypeToStoredUnit } from '../utils/unit'

import { UrbanStatsASTExpression } from './ast'
import { unitNamedByConstant } from './constants/units'
import * as l from './literal-parser'
import { TypeEnvironment } from './types-values'

/**
 * What a caller has decided particular expressions are written in, whatever they work out to on
 * their own: a map drawn in a declared unit, a table column written in one. Held by the identity of
 * the node, so that a caller says which expression it means without unit inference having to know
 * what a map or a column is.
 */
export type DeclaredUnits = ReadonlyMap<object, StoredUnit>

export const nothingDeclared: DeclaredUnits = new Map()

/**
 * Says that the map's data is written in the unit its caller worked out. A script that declares
 * none draws whatever it works out to, so nothing is said of the node.
 */
export function assignDeclaredMapUnit(uss: MapUSS, typeEnvironment: TypeEnvironment, declared: UnitType | undefined): DeclaredUnits {
    if (declared === undefined) {
        return nothingDeclared
    }
    const data = mapDataExpression(uss, typeEnvironment)
    return data === undefined ? nothingDeclared : new Map([[data, unitTypeToStoredUnit(declared)]])
}

/** Says that each column of a table is written in the unit its caller worked out for it. */
export function assignDeclaredColumnUnits(uss: MapUSS, typeEnvironment: TypeEnvironment, declared: (UnitType | undefined)[]): DeclaredUnits {
    const units = new Map<object, StoredUnit>()
    declared.forEach((unit, index) => {
        if (unit === undefined) {
            return
        }
        const values = tableColumnExpression(uss, typeEnvironment, index)
        if (values !== undefined) {
            units.set(values, unitTypeToStoredUnit(unit))
        }
    })
    return units
}

/** The unit an argument names outright, which is the only way a script can be read for one. */
function unitNamedOutright(written: UrbanStatsASTExpression | undefined): UnitType | undefined {
    return written?.type === 'identifier' ? unitNamedByConstant.get(written.name.node) : undefined
}

const mapUnit = mapUssParser(l.call({
    fn: l.ignore(),
    namedArgs: { unit: l.optional(l.passthrough()) },
    unnamedArgs: [],
}), 'dont-reparse')

/**
 * The unit a map declares, read off the script rather than handed over by a run. For the one caller
 * that titles a map before running it, so there is no run to ask.
 */
export function assignMapUnitStatically(uss: MapUSS, typeEnvironment: TypeEnvironment): DeclaredUnits {
    const written = read(mapUnit, uss, typeEnvironment)?.namedArgs.unit
    return assignDeclaredMapUnit(uss, typeEnvironment, unitNamedOutright(written))
}

const columnUnits = mapUssParser(l.call({
    fn: l.ignore(),
    namedArgs: {
        columns: l.vector(l.call({
            fn: l.ignore(),
            namedArgs: { unit: l.optional(l.passthrough()) },
            unnamedArgs: [],
        })),
    },
    unnamedArgs: [],
}), 'dont-reparse')

/** The same for each column of a table, for the caller that titles one before running it. */
export function assignColumnUnitsStatically(uss: MapUSS, typeEnvironment: TypeEnvironment): DeclaredUnits {
    const columns = read(columnUnits, uss, typeEnvironment)?.namedArgs.columns ?? []
    return assignDeclaredColumnUnits(uss, typeEnvironment, columns.map(({ namedArgs }) => unitNamedOutright(namedArgs.unit)))
}
