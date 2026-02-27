import { PageDescriptor } from '../navigation/PageDescriptor'
import { unparse } from '../urban-stats-script/parser'

import { StatSettings } from './types'

export function pageDescriptor({ stat, view }: StatSettings): PageDescriptor & { kind: 'statistic' } {
    return {
        kind: 'statistic',
        article_type: stat.articleType,
        start: view.start,
        amount: view.amount,
        order: view.order,
        highlight: view.highlight,
        universe: stat.universe,
        edit: view.edit,
        sort_column: view.sortColumn,
        ...(stat.type === 'uss' ? { uss: unparse(stat.uss, { simplify: false }) } : { statname: stat.statName }),
    }
}
