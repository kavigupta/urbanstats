import assert from 'assert'

import { stringify } from 'csv-stringify/sync'
import { saveAs } from 'file-saver'
import React, { ReactNode } from 'react'

import { USSOpaqueValue, USSValue } from '../urban-stats-script/types-values'
import { Article } from '../utils/protos'

import { ArticleRow } from './load-article'

export interface CSVExportData {
    csvData: string[][]
    csvFilename: string
}

export function exportToCSV(data: string[][], filename: string): void {
    // Use csv-stringify library for proper CSV generation
    const csvContent = stringify(data, {
        header: false, // We're already providing headers in the data
        delimiter: ',',
        quoted: true, // Quote all fields for consistency
        quoted_empty: true,
        quoted_string: true,
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, filename)
}

export function CSVButton(props: { onClick: () => void }): ReactNode {
    return (
        <div
            onClick={props.onClick}
            style={{
                height: '100%',
                cursor: 'pointer',
            }}
        >
            <img src="/csv.png" alt="CSV Export Button" style={{ height: '100%' }} />
        </div>
    )
}

export function generateCSVDataForArticles(
    articles: Article[],
    dataByArticleStat: ArticleRow[][],
    includeOrdinals: boolean,
): string[][] {
    const names = articles.map(a => a.longname)
    const statNames = dataByArticleStat[0].map(row => row.renderedStatname)
    const headerRow = ['Region', ...statNames]

    if (includeOrdinals) {
        headerRow.push(...statNames.flatMap(statName => [`${statName} (Rank)`, `${statName} (Percentile)`]))
    }

    const dataRows: string[][] = []

    for (let articleIndex = 0; articleIndex < articles.length; articleIndex++) {
        const row = [names[articleIndex]]

        for (let statIndex = 0; statIndex < dataByArticleStat[0].length; statIndex++) {
            const rowData = dataByArticleStat[articleIndex][statIndex]
            row.push(rowData.statval.toString())
        }

        if (includeOrdinals) {
            for (let statIndex = 0; statIndex < dataByArticleStat[0].length; statIndex++) {
                const rowData = dataByArticleStat[articleIndex][statIndex]
                row.push(rowData.ordinal.toString())
                row.push(rowData.percentileByPopulation.toString())
            }
        }

        dataRows.push(row)
    }

    return [headerRow, ...dataRows]
}

function processContextIntoMapping(context: Map<string, USSValue>): [string[], Map<string, number[]>] | [undefined, undefined] {
    const geo = context.get('geoName')
    if (geo === undefined) {
        return [undefined, undefined]
    }
    assert(geo.value instanceof Array, 'geo variable is not an array')
    const geoArray = geo.value as string[]
    const relevantVariables = [...context.entries()].filter(([, v]) => v.documentation?.fromStatisticColumn).map(([k]) => k)
    const variableValues = []
    for (const varName of relevantVariables) {
        const varValue = context.get(varName)
        assert(varValue?.value instanceof Array, `context variable ${varName} is not an array`)
        const varArray = varValue.value as number[]
        variableValues.push(varArray)
    }

    const valuesEach = new Map<string, number[]>()
    for (let i = 0; i < geoArray.length; i++) {
        const name = geoArray[i]
        const valuesForThis: number[] = variableValues.map(v => v[i])
        valuesEach.set(name, valuesForThis)
    }

    return [relevantVariables, valuesEach]
}

export function generateMapperCSVData(
    result: USSOpaqueValue & { opaqueType: 'cMap' | 'cMapRGB' | 'pMap' },
    context: Map<string, USSValue>,
): string[][] {
    const headerRow: string[] = []

    headerRow.push('Geography')
    if (result.opaqueType === 'cMap' || result.opaqueType === 'pMap') {
        headerRow.push('Value')
    }
    else {
        // eslint-disable-next-line no-restricted-syntax -- column headers not colors
        headerRow.push('Red', 'Green', 'Blue')
    }

    const geo = result.value.geo

    const [contextVarNames, valuesEach] = processContextIntoMapping(context)
    if (contextVarNames !== undefined) {
        headerRow.push(...contextVarNames)
    }

    const dataRows: string[][] = geo.map((name, i) => {
        const row: string[] = []

        row.push(name)
        if (result.opaqueType === 'cMap' || result.opaqueType === 'pMap') {
            const value = result.value.data[i]
            row.push(value.toLocaleString())
        }
        else {
            const r = result.value.dataR[i]
            const g = result.value.dataG[i]
            const b = result.value.dataB[i]
            row.push(r.toLocaleString(), g.toLocaleString(), b.toLocaleString())
        }
        if (contextVarNames !== undefined) {
            const contextValues = valuesEach.get(name)
            assert(contextValues !== undefined, `Context values for geography ${name} not found`)
            row.push(...contextValues.map(v => v.toString()))
        }

        return row
    })

    return [headerRow, ...dataRows]
}
