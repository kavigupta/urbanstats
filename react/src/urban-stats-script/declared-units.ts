import { mapDataExpression, MapUSS, mapUssParser, read, tableColumnExpression } from '../mapper/settings/map-uss'
import { StoredUnit } from '../utils/quantity'
import { UnitType, unitTypeToStoredUnit } from '../utils/unit'

import { UrbanStatsASTExpression } from './ast'
import { unitConstants } from './constants/units'
import * as l from './literal-parser'
import { TypeEnvironment } from './types-values'

/**
 * What a caller has decided particular expressions' units are. Used for the
 * map and column's unit= argument.
 */
export type DeclaredUnits = ReadonlyMap<object, StoredUnit>

export const nothingDeclared: DeclaredUnits = new Map()

export function constructDeclaredUnitsForMap(uss: MapUSS, typeEnvironment: TypeEnvironment, declared: UnitType | undefined): DeclaredUnits {
    if (declared === undefined) {
        return nothingDeclared
    }
    const data = mapDataExpression(uss, typeEnvironment)
    return data === undefined ? nothingDeclared : new Map([[data, unitTypeToStoredUnit(declared)]])
}

export function constructDeclaredUnitsForTable(uss: MapUSS, typeEnvironment: TypeEnvironment, declared: (UnitType | undefined)[]): DeclaredUnits {
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

const constantNameToUnit = new Map<string, UnitType>(
    unitConstants.map(([constant, { value }]) => [constant, (value as { value: { unit: UnitType } }).value.unit]),
)

function getUnitFromIdentifier(written: UrbanStatsASTExpression | undefined): UnitType | undefined {
    return written?.type === 'identifier' ? constantNameToUnit.get(written.name.node) : undefined
}

const mapUnit = mapUssParser(l.call({
    fn: l.ignore(),
    namedArgs: { unit: l.optional(l.passthrough()) },
    unnamedArgs: [],
}), 'dont-reparse')

/** constructDeclaredUnitsForMap without running the script. Only handles unit= arguments that are constant identifiers. */
export function constructDeclaredUnitsForMapStatically(uss: MapUSS, typeEnvironment: TypeEnvironment): DeclaredUnits {
    const written = read(mapUnit, uss, typeEnvironment)?.namedArgs.unit
    return constructDeclaredUnitsForMap(uss, typeEnvironment, getUnitFromIdentifier(written))
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

/** Equivalent of constructDeclaredUnitsForMapStatically for a table's columns. */
export function constructDeclaredUnitsForTableStatically(uss: MapUSS, typeEnvironment: TypeEnvironment): DeclaredUnits {
    const columns = read(columnUnits, uss, typeEnvironment)?.namedArgs.columns ?? []
    return constructDeclaredUnitsForTable(uss, typeEnvironment, columns.map(({ namedArgs }) => getUnitFromIdentifier(namedArgs.unit)))
}
