import { StatPath, statPathToOrder } from '../page_template/statistic-tree'

/**
 * Each warning goes before the first row that follows it in tree order. Counting earlier rows instead
 * would miscount the metadata rows, which trail the table out of tree order.
 */
export function warningRowIndices(rowStatPaths: StatPath[], warningOrders: number[]): number[] {
    const rowOrders = rowStatPaths.map(path => statPathToOrder.get(path)!)
    return warningOrders.map((warningOrder) => {
        const index = rowOrders.findIndex(rowOrder => rowOrder > warningOrder)
        return index === -1 ? rowOrders.length : index
    })
}
