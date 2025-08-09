import { allUnitTypes, getUnitName } from '../../utils/unit'
import { USSValue, USSOpaqueType } from '../types-values'

const unitType: USSOpaqueType = { type: 'opaque', name: 'Unit' }

function createUnit(name: string, humanReadableName: string): [string, USSValue] {
    return [
        `unit${name.slice(0, 1).toUpperCase()}${name.slice(1)}`,
        {
            type: unitType,
            value: { type: 'opaque', opaqueType: 'unit', value: { unit: name } },
            documentation: { humanReadableName },
        },
    ]
}

export const unitConstants: [string, USSValue][] = allUnitTypes.map(unit =>
    createUnit(unit, getUnitName(unit)),
)
