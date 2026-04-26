export interface CongressionalRepresentativeEntry {
    representative: {
        name: string
        wikipediaPage: string
        party?: string
    }
    districtLongname: string
    startTerm: number
    endTerm: number
}

export interface CongressionalColumnData {
    longname: string
    representatives: CongressionalRepresentativeEntry[]
}

export interface CongressionalDisplayHeaderSpaceRow {
    kind: 'header-space'
    displayIndex: number
}

export interface CongressionalDisplayTermLabelRow {
    kind: 'term-label'
    displayIndex: number
    termStart: number
}

export type CongressionalDisplayRow = CongressionalDisplayHeaderSpaceRow | CongressionalDisplayTermLabelRow

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
