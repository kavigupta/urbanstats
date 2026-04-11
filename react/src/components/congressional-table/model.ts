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

export interface RepresentativesForRegionDistrictAndTermRun {
    representatives: CongressionalRepresentativeEntry['representative'][]
    startTerm: number
    endTerm: number
}

export interface RepresentativesForRegionAndDistrict {
    termRuns: RepresentativesForRegionDistrictAndTermRun[]
}

export interface RepresentativesForRegionAndDistrictSet {
    startTermIndex: number
    endTermIndex: number
    headerDisplayIndex?: number
    contentStartDisplayIndex: number
    contentEndDisplayIndex: number
    districtHeaders: string[][]
    congressionalRuns: RepresentativesForRegionAndDistrict[]
}

export interface RepresentativesForRegion {
    longname: string
    sections: RepresentativesForRegionAndDistrictSet[]
}

export interface CongressionalTableModel {
    displayRows: CongressionalDisplayRow[]
    supercolumns: RepresentativesForRegion[]
}
