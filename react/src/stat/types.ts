import statnames from '../data/statistic_name_list'
import { MapUSS } from '../mapper/settings/map-uss'
import { Universe } from '../universe'

export type Statistic = {
    universe: Universe
    articleType: string
} & ({
    type: 'uss'
    uss: MapUSS
} | { type: 'simple', statName: typeof statnames[number] })

export interface View {
    start: number
    amount: 'All' | number
    order: 'ascending' | 'descending'
    highlight?: string
    edit: boolean
    sortColumn: number
}
