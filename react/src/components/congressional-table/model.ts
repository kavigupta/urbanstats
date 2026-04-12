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

export interface RepresentativesForRegionDistrictAndDisplayRun {
    representatives: CongressionalRepresentativeEntry['representative'][]
    startDisplayIndex: number
    endDisplayIndex: number
}

export interface RepresentativesForRegionAndDistrict {
    displayRuns: RepresentativesForRegionDistrictAndDisplayRun[]
}

export interface RepresentativesForRegionAndDistrictSet {
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
