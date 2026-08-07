import { assert } from '../../utils/defensive'
import { MetadataStatValue } from '../load-article'

export interface CongressionalRepresentativeEntry {
    representative: {
        name: string
        wikipediaPage?: string
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

/** Takes the row structurally so it works with both ArticleRow and StatisticCellRenderingInfo. */
export function congressionalDataForRow(
    row: { kind: 'statistic' } | { kind: 'metadata', statval: MetadataStatValue },
    longname: string,
): CongressionalColumnData | undefined {
    if (row.kind !== 'metadata' || typeof row.statval === 'string') {
        return undefined
    }
    return {
        longname,
        representatives: row.statval.representatives.map((r): CongressionalRepresentativeEntry => {
            assert(r.representative.name !== undefined && r.representative.name !== null, 'representative name missing')
            return {
                representative: {
                    name: r.representative.name,
                    wikipediaPage: r.representative.wikipediaPage ?? undefined,
                    party: r.representative.party ?? undefined,
                },
                districtLongname: r.districtLongname,
                startTerm: r.startTerm,
                endTerm: r.endTerm,
            }
        }),
    }
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
