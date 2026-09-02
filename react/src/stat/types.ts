import { StatCol } from '../components/load-article'
import statnames from '../data/statistic_name_list'
import { MapUSS } from '../mapper/settings/map-uss'
import { Universe } from '../universe'
import { TableTextValues } from '../urban-stats-script/constants/table'
import { HumanReadableName } from '../utils/human-readable-element'
import { StoredUnit } from '../utils/quantity'

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

export type StatColumn = {
    name: HumanReadableName
    unit?: StoredUnit
} & (
    { value: number[], populationPercentile: number[], ordinal: number[] } |
    { value: TableTextValues, populationPercentile?: undefined, ordinal?: undefined }
)

export interface StatData {
    // One entry per column
    table: StatColumn[]
    articleNames: string[]
    renderedStatname: HumanReadableName
    statcol?: StatCol
    explanationPage?: string
    totalCountInClass: number
    totalCountOverall: number
    hideOrdinalsPercentiles: boolean
}

export interface ActionOptions { undoable?: boolean, update?: boolean, push?: boolean }

export type StatSetter = (newSettings: Partial<StatSettings>, actionOptions: ActionOptions) => void
