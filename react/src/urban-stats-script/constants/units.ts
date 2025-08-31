import { allUnitTypes, getUnitName, UnitType } from '../../utils/unit'
import { USSValue, USSOpaqueType } from '../types-values'

const unitType: USSOpaqueType = { type: 'opaque', name: 'Unit' }

function createUnit(name: UnitType, humanReadableName: string): [string, USSValue] {
    return [
        `unit${name.slice(0, 1).toUpperCase()}${name.slice(1)}`,
        {
            type: unitType,
            value: { type: 'opaque', opaqueType: 'unit', value: { unit: name } },
            documentation: {
                humanReadableName,
                category: 'unit',
                isDefault: name === 'number',
                longDescription: `Unit type representing ${humanReadableName.toLowerCase()} measurements.`,
                documentationTable: 'unit-types',
            },
        },
    ]
}

export const unitConstants: [string, USSValue][] = allUnitTypes.map(unit =>
    createUnit(unit, getUnitName(unit)),
)
