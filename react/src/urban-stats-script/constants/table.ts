import { assert } from '../../utils/defensive'
import { UnitType } from '../../utils/unit'
import { Context } from '../context'
import { noLocation } from '../location'
import { USSType, USSValue, USSRawValue, OriginalFunctionArgs, NamedFunctionArgumentWithDocumentation, createConstantExpression } from '../types-values'

export interface TableColumn {
    name: string
    values: number[]
    unit?: UnitType
}

export interface Table {
    columns: TableColumn[]
    geo: string[]
    population: number[]
}

export const columnType = {
    type: 'opaque',
    name: 'column',
} satisfies USSType

export const tableType = {
    type: 'opaque',
    name: 'table',
} satisfies USSType

export const column: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            name: {
                type: { type: 'concrete', value: { type: 'string' } },
            },
            values: {
                type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } },
            },
            unit: {
                type: { type: 'concrete', value: { type: 'opaque', name: 'Unit' } },
                defaultValue: createConstantExpression(null),
            },
        },
        returnType: { type: 'concrete', value: columnType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>, _originalArgs: OriginalFunctionArgs): USSRawValue => {
        const name = namedArgs.name as string
        const values = namedArgs.values as number[]
        const unitArg = namedArgs.unit as { type: 'opaque', opaqueType: 'Unit', value: { unit: string } } | null
        const unit = unitArg ? (unitArg.value.unit as UnitType) : undefined
        return {
            type: 'opaque',
            opaqueType: 'column',
            value: { name, values, unit } satisfies TableColumn,
        }
    },
    documentation: {
        humanReadableName: 'Column',
        category: 'map',
        isDefault: true,
        namedArgs: {
            name: 'Name',
            values: 'Values',
            unit: 'Unit',
        },
        longDescription: 'Creates a column with a name and a list of cell values. Optionally specify a unit type.',
    },
} satisfies USSValue

export const table: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            geo: {
                type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'opaque', name: 'geoFeatureHandle' } } },
                defaultValue: {
                    type: 'identifier',
                    name: { node: 'geo', location: noLocation },
                },
                documentation: {
                    hide: true,
                },
            } satisfies NamedFunctionArgumentWithDocumentation,
            population: {
                type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'number' } } },
                defaultValue: {
                    type: 'identifier',
                    name: { node: 'population', location: noLocation },
                },
                documentation: {
                    hide: true,
                },
            } satisfies NamedFunctionArgumentWithDocumentation,
            columns: {
                type: { type: 'concrete', value: { type: 'vector', elementType: { type: 'opaque', name: 'column' } } },
            },
        },
        returnType: { type: 'concrete', value: tableType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- consistency with parents
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>, originalArgs: OriginalFunctionArgs): USSRawValue => {
        const geoRaw = namedArgs.geo as USSRawValue[]
        const geo: string[] = geoRaw.map((g) => {
            const geoHandle = g as { type: 'opaque', opaqueType: string, value: string }
            assert(geoHandle.opaqueType === 'geoFeatureHandle', 'Expected geoFeatureHandle opaque value')
            return geoHandle.value
        })
        const population = namedArgs.population as number[]
        const columnsRaw = namedArgs.columns as { type: 'opaque', opaqueType: 'column', value: TableColumn }[] | null

        if (columnsRaw === null) {
            return {
                type: 'opaque',
                opaqueType: 'table',
                value: { columns: [], geo, population } satisfies Table,
            }
        }

        const columns: TableColumn[] = columnsRaw.map((col) => {
            return col.value
        })

        // Validate that all columns have the same length
        if (columns.length > 0) {
            const firstLength = columns[0].values.length
            for (let i = 1; i < columns.length; i++) {
                if (columns[i].values.length !== firstLength) {
                    throw new Error(`All columns must have the same length. Column "${columns[0].name}" has length ${firstLength}, but column "${columns[i].name}" has length ${columns[i].values.length}`)
                }
            }
        }

        if (columns.length > 0 && geo.length !== columns[0].values.length) {
            throw new Error(`geo must have the same length as columns. geo has length ${geo.length}, but columns have length ${columns[0].values.length}`)
        }

        return {
            type: 'opaque',
            opaqueType: 'table',
            value: { columns, geo, population } satisfies Table,
        }
    },
    documentation: {
        humanReadableName: 'Table',
        category: 'map',
        isDefault: true,
        namedArgs: {
            columns: 'Columns',
        },
        longDescription: 'Creates a table with named columns, where each column contains a list of numbers. All columns must have the same length.',
    },
} satisfies USSValue
