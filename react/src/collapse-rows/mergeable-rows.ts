import { ArticleRow } from '../components/load-article'
import { assert } from '../utils/defensive'

function metadataValuesMergeable(value1: string | number, value2: string | number): boolean {
    return JSON.stringify(value1) === JSON.stringify(value2)
}

function columnsMergeable(column1: ArticleRow[], column2: ArticleRow[]): boolean {
    assert(column1.length === column2.length, 'Columns must have the same length')
    return column1.every((row, index) => row.mergeable && column2[index].mergeable && metadataValuesMergeable(row.statval, column2[index].statval))
}

function collapsedRenderedStatname(rowsForArticle: ArticleRow[]): string {
    throw new Error(`currently, we do not support collapsing statistic rows: rows claiming mergeability: ${JSON.stringify(rowsForArticle)}`)
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

    return groupedColumns.map((columnGroup) => {
        if (columnGroup.length === 1) {
            return columnGroup[0]
        }
        return columnGroup[0].map((_, articleIndex) => {
            const rowsForArticle = columnGroup.map(column => column[articleIndex])
            return {
                ...rowsForArticle[0],
                renderedStatname: collapsedRenderedStatname(rowsForArticle),
            }
        })
    })
}
