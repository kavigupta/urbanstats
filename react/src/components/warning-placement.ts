import { StatPath, statPathToOrder } from '../page_template/statistic-tree'

/**
 * Where each warning's row goes in a table whose rows are `rowStatPaths`: the index of the first
 * row that comes after the warning in statistic tree order, which is where the statistics the
 * warning stands in for would have gone.
 *
 * Metadata rows sit at the end of the table rather than in tree order, so this looks for the first
 * row that is later rather than counting the rows that are earlier -- the latter would count those
 * trailing rows as preceding every warning. Ascending `warningOrders` give ascending indices.
 */
export function warningRowIndices(rowStatPaths: StatPath[], warningOrders: number[]): number[] {
    const rowOrders = rowStatPaths.map(path => statPathToOrder.get(path)!)
    return warningOrders.map((warningOrder) => {
        const index = rowOrders.findIndex(rowOrder => rowOrder > warningOrder)
        return index === -1 ? rowOrders.length : index
    })
}
