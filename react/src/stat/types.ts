import { StatCol } from '../components/load-article'
import statnames from '../data/statistic_name_list'
import { MapUSS } from '../mapper/settings/map-uss'
import { Universe } from '../universe'
import { UnitType } from '../utils/unit'

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

export interface StatSettings {
    stat: Statistic
    view: View
}

export interface StatData {
    // One entry per column
    table: { value: number[], populationPercentile: number[], ordinal: number[], name: string, unit?: UnitType }[]
    articleNames: string[]
    renderedStatname: string
    statcol?: StatCol
    explanationPage?: string
    totalCountInClass: number
    totalCountOverall: number
    hideOrdinalsPercentiles: boolean
}

export interface ActionOptions { undoable?: boolean, history: 'replace' | 'push' }

export type StatSetter = (newSettings: Partial<StatSettings>, actionOptions: ActionOptions) => void
