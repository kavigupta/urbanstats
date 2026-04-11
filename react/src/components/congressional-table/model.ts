export interface CongressionalRepresentativeEntry {
    representative: {
        name?: string | null
        wikipediaPage?: string | null
        party?: string | null
    }
    districtLongname?: string
    startTerm?: number
    endTerm?: number
}

export interface CongressionalColumnData {
    longname: string
    representatives: CongressionalRepresentativeEntry[]
}

export interface CongressionalDisplayRow {
    kind: 'header-space' | 'term-label'
    termIndex: number
    termStart?: number
}

export interface CongressionalRunModel {
    representatives: CongressionalRepresentativeEntry['representative'][]
    termCounts: number[]
    termsByRepresentative: number[][]
}

export interface DistrictConfigurationSection {
    startTermIndex: number
    endTermIndex: number
    headerDisplayIndex?: number
    contentStartDisplayIndex: number
    contentEndDisplayIndex: number
    districtHeaders: string[]
    congressionalRuns: CongressionalRunModel[]
}

export interface CongressionalSupercolumn {
    longname: string
    sections: DistrictConfigurationSection[]
}

export interface CongressionalTableModel {
    displayRows: CongressionalDisplayRow[]
    supercolumns: CongressionalSupercolumn[]
}
