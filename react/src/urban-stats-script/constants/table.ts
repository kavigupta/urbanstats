import { assert } from '../../utils/defensive'
import { HumanReadableName } from '../../utils/human-readable-element'
import { hre, parseHumanReadableTemplate } from '../../utils/human-readable-template'
import { UnitType } from '../../utils/unit'
import { Context } from '../context'
import { noLocation } from '../location'
import { USSType, USSValue, USSRawValue, OriginalFunctionArgs, NamedFunctionArgumentWithDocumentation, createConstantExpression } from '../types-values'

/** Homogeneous, as any USS vector is. */
export type TableColumnValues = number[] | string[] | boolean[]

export interface TableColumn {
    name?: HumanReadableName
    values: TableColumnValues
    unit?: UnitType
}

export type TableColumnWithPopulationPercentiles = TableColumn & {
    // Absent on string and boolean columns, which have no scale to place a row on.
    populationPercentiles?: number[]
}

/** The first cell tells the whole column; an empty column counts as numeric. */
export function numberColumnValues(values: TableColumnValues): number[] | undefined {
    return values.length === 0 || typeof values[0] === 'number' ? values as number[] : undefined
}

export interface Table {
    columns: TableColumnWithPopulationPercentiles[]
    geo: string[]
    population: number[]
    hideOrdinalsPercentiles: boolean
    title?: HumanReadableName
}

const columnType = {
    type: 'opaque',
    name: 'column',
} satisfies USSType

export const tableType = {
    type: 'opaque',
    name: 'table',
} satisfies USSType

const nameSyntaxDescription = hre`Supports subscript with \`_{...}\` and superscript with \`^{...}\`, e.g. \`"log_{10}(Density)^{2}"\`.`

export const column: USSValue = {
    type: {
        type: 'function',
        posArgs: [],
        namedArgs: {
            values: {
                type: { type: 'anyPrimitiveVector' },
            },
            name: {
                type: { type: 'concrete', value: { type: 'string' } },
                defaultValue: createConstantExpression(null),
            },
            unit: {
                type: { type: 'concrete', value: { type: 'opaque', name: 'Unit' } },
                defaultValue: createConstantExpression(null),
            },
        },
        returnType: { type: 'concrete', value: columnType },
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- needed for USSValue interface
    value: (ctx: Context, posArgs: USSRawValue[], namedArgs: Record<string, USSRawValue>, originalArgs: OriginalFunctionArgs): USSRawValue => {
        const namePassedIn = namedArgs.name as string | null
        const values = namedArgs.values as TableColumnValues
        const unitArg = namedArgs.unit as { type: 'opaque', opaqueType: 'Unit', value: { unit: string } } | null
        const unit = unitArg ? (unitArg.value.unit as UnitType) : undefined

        const name: HumanReadableName | undefined = namePassedIn !== null ? parseHumanReadableTemplate(namePassedIn) : undefined

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
        longDescription: hre`Creates a column with a name and a list of cell values, which can be numbers, strings, or booleans (rendered as ✅/❌). The name can be automatically derived from the values argument if not provided. Optionally specify a unit type. ${nameSyntaxDescription}`,
    },
} satisfies USSValue

const titleSyntaxDescription = hre`The title argument supports subscript with \`_{...}\` and superscript with \`^{...}\`, e.g. \`title="log_{10}(Density)^{2}"\`.`

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
            hideOrdinalsPercentiles: {
                type: { type: 'concrete', value: { type: 'boolean' } },
                defaultValue: createConstantExpression(false),
            },
            title: {
                type: { type: 'concrete', value: { type: 'string' } },
                defaultValue: createConstantExpression(null),
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
        const columnsRaw = namedArgs.columns as { type: 'opaque', opaqueType: 'column', value: TableColumn }[]

        const columns: TableColumn[] = columnsRaw.map((col) => {
            return col.value
        })

        // Validate that all columns have the same length
        if (columns.length > 0) {
            const firstLength = columns[0].values.length
            for (let i = 1; i < columns.length; i++) {
                if (columns[i].values.length !== firstLength) {
                    throw new Error(`All columns must have the same length. Column 1 has length ${firstLength}, but column ${i + 1} has length ${columns[i].values.length}`)
                }
            }
        }

        if (columns.length > 0 && geo.length !== columns[0].values.length) {
            throw new Error(`geo must have the same length as columns. geo has length ${geo.length}, but columns have length ${columns[0].values.length}`)
        }

        const hideOrdinalsPercentiles = namedArgs.hideOrdinalsPercentiles as boolean
        const titlePassedIn = namedArgs.title as string | null
        const title = titlePassedIn !== null ? parseHumanReadableTemplate(titlePassedIn) : undefined
        const annotatedColumns = columns.map(col => attachPopulationPercentilesToColumn(col, population))

        return {
            type: 'opaque',
            opaqueType: 'table',
            value: { columns: annotatedColumns, geo, population, hideOrdinalsPercentiles, title } satisfies Table,
        }
    },
    documentation: {
        humanReadableName: 'Table',
        category: 'map',
        isDefault: true,
        namedArgs: {
            columns: 'Columns',
            hideOrdinalsPercentiles: 'Hide Ordinals/Percentiles',
            title: 'Title',
        },
        longDescription: hre`Creates a table with named columns, where each column contains a list of numbers, strings, or booleans. All columns must have the same length. Optionally hide ordinals and percentiles (default: false, i.e., show them). Optionally specify a title for the table. ${titleSyntaxDescription}`,
    },
} satisfies USSValue

export function orderNonNan(a: number, b: number): number {
    const aIsNan = Number.isNaN(a)
    const bIsNan = Number.isNaN(b)
    if (aIsNan && bIsNan) {
        return 0
    }
    if (aIsNan) {
        return -1
    }
    if (bIsNan) {
        return 1
    }
    return a - b
}

/** How a column sorts, whichever of the three kinds of value it holds. */
export function orderCells(a: number | string | boolean, b: number | string | boolean): number {
    if (typeof a === 'string' && typeof b === 'string') {
        return a.localeCompare(b)
    }
    return orderNonNan(Number(a), Number(b))
}

function attachPopulationPercentilesToColumn(col: TableColumn, population: number[]): TableColumnWithPopulationPercentiles {
    const numbers = numberColumnValues(col.values)
    if (numbers === undefined) {
        return col
    }
    const sortedIdxs = numbers
        .map((v, idx) => ({ v, idx }))
        .sort((a, b) => orderNonNan(a.v, b.v))
        .map(({ idx }) => idx)

    const cumulativePopulations: number[] = []
    let cumulativeSum = 0
    for (const idx of sortedIdxs) {
        cumulativePopulations[idx] = cumulativeSum
        cumulativeSum += population[idx]
    }
    const totalPopulation = cumulativeSum

    const populationPercentiles: number[] = numbers.map((_, idx) => {
        const cumPop = cumulativePopulations[idx]
        return totalPopulation === 0 ? 0 : Math.floor((cumPop / totalPopulation) * 100)
    })
    return {
        ...col,
        populationPercentiles,
    }
}
