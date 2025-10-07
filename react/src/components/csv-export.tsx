import { stringify } from 'csv-stringify/sync'
import { saveAs } from 'file-saver'
import React, { ReactNode } from 'react'

import { Article } from '../utils/protos'

import { ArticleRow } from './load-article'

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
