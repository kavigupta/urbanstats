import { ArticleRow, MetadataStatValue } from '../components/load-article'
import { assert } from '../utils/defensive'

function metadataValuesMergeable(value1: MetadataStatValue | number, value2: MetadataStatValue | number): boolean {
    return JSON.stringify(value1) === JSON.stringify(value2)
}

function columnsMergeable(column1: ArticleRow[], column2: ArticleRow[]): boolean {
    assert(column1.length === column2.length, 'Columns must have the same length')
    return column1.every((row, index) => row.mergeable && column2[index].mergeable && metadataValuesMergeable(row.statval, column2[index].statval))
}

function matchRepresentativeRangeLabel(label: string): RegExpExecArray | null {
    return /^Representative \((\d{4})-(\d{2,4})\)$/.exec(label)
}

function parseRepresentativeRangeLabel(label: string): { prefix: string, startYear: string, endYear: string } {
    const match = matchRepresentativeRangeLabel(label)
    assert(match !== null, `currently, we can only collapse representatives, got ${label}`)
    return { prefix: 'Representative', startYear: match[1], endYear: match[2] }
}

function renderBoundary(startYear: number, prevRows?: ArticleRow[]): string {
    if (startYear === 1789) {
        // only ever 1789-??, this is the start year.
        return startYear.toString()
    }
    if (prevRows === undefined || prevRows.length === 0 || !matchRepresentativeRangeLabel(prevRows[0].renderedStatname)) {
        return ''
    }
    return startYear.toString()
}

function collapsedRenderedStatname(rowsForArticle: ArticleRow[], prevRows?: ArticleRow[], nextRows?: ArticleRow[]): string {
    const { prefix: prefixStart, startYear } = parseRepresentativeRangeLabel(rowsForArticle[0].renderedStatname)
    const { prefix: prefixEnd, endYear } = parseRepresentativeRangeLabel(rowsForArticle[rowsForArticle.length - 1].renderedStatname)
    console.log(rowsForArticle[0].renderedStatname)
    console.log('prev', prevRows?.[0].renderedStatname)
    console.log('next', nextRows?.[0].renderedStatname)
    assert(prefixStart === prefixEnd, `We can only collapse rows with the same prefix, got ${prefixStart} and ${prefixEnd}`)
    const startYearRendered = renderBoundary(parseInt(startYear), prevRows)
    const endYearRendered = renderBoundary(parseInt(endYear), nextRows)
    return `${prefixStart} (${startYearRendered}-${endYearRendered})`
}

export function mergeMergeableRows(rows: ArticleRow[][]): ArticleRow[][] {
    if (rows.length <= 1) {
        return rows
    }

    const groupedColumns: ArticleRow[][][] = [[rows[0]]]
    for (const rowByArticle of rows.slice(1)) {
        const lastGroup = groupedColumns[groupedColumns.length - 1]
        const previousColumn = lastGroup[lastGroup.length - 1]
        if (columnsMergeable(previousColumn, rowByArticle)) {
            lastGroup.push(rowByArticle)
        }
        else {
            groupedColumns.push([rowByArticle])
        }
    }

    return groupedColumns.map((columnGroup, columnGroupIndex) => {
        if (columnGroup.length === 1) {
            return columnGroup[0]
        }
        return columnGroup[0].map((_, articleIndex) => {
            const rowsForArticle = columnGroup.map(column => column[articleIndex])
            return {
                ...rowsForArticle[0],
                renderedStatname: collapsedRenderedStatname(
                    rowsForArticle,
                    columnGroupIndex === 0 ? undefined : groupedColumns[columnGroupIndex - 1][0],
                    columnGroupIndex === groupedColumns.length - 1 ? undefined : groupedColumns[columnGroupIndex + 1][0],
                ),
            }
        })
    })
}
