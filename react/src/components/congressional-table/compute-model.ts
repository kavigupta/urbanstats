import { assert } from '../../utils/defensive'

import {
    CongressionalColumnData,
    CongressionalRepresentativeEntry,
    RepresentativesForRegionDistrictAndDisplayRun,
    RepresentativesForRegion,
    CongressionalTableModel,
    RepresentativesForRegionAndDistrictSet,
    CongressionalDisplayRow,
} from './model'

export interface CongressionalRegionData {
    longname?: string
    representatives: CongressionalRepresentativeEntry[]
}

function termStartsForEntry(entry: CongressionalRepresentativeEntry): number[] {
    assert(entry.startTerm !== undefined && entry.endTerm !== undefined, 'Entry must have defined startTerm and endTerm')
    const terms = []
    for (let term = entry.startTerm; term <= entry.endTerm; term += 2) {
        terms.push(term)
    }
    return terms
}

function entryCoversTerm(entry: CongressionalRepresentativeEntry, termStart: number): boolean {
    assert(entry.startTerm !== undefined && entry.endTerm !== undefined, 'Entry must have defined startTerm and endTerm')
    return entry.startTerm <= termStart && entry.endTerm >= termStart
}

function representativeIdentity(entry: CongressionalRepresentativeEntry): string {
    return `${entry.representative.name ?? ''}|${entry.districtLongname ?? ''}|${entry.startTerm ?? ''}|${entry.endTerm ?? ''}`
}

function districtLabel(entry: CongressionalRepresentativeEntry): string {
    return entry.districtLongname ?? 'District unknown'
}

interface DistrictBucketForTerm {
    districtLabel: string
    representatives: CongressionalRepresentativeEntry['representative'][]
    signature: string
}

function representativeSignature(entry: CongressionalRepresentativeEntry): string {
    return `${entry.representative.name ?? ''}|${entry.representative.wikipediaPage ?? ''}|${entry.representative.party ?? ''}`
}

function representativeValueSignature(representative: CongressionalRepresentativeEntry['representative']): string {
    return `${representative.name ?? ''}|${representative.wikipediaPage ?? ''}|${representative.party ?? ''}`
}

function representativeListSignature(representatives: CongressionalRepresentativeEntry['representative'][]): string {
    return representatives
        .map(representativeValueSignature)
        .join('||')
}

function uniqueRepresentatives(entries: CongressionalRepresentativeEntry[]): CongressionalRepresentativeEntry['representative'][] {
    const seen = new Set<string>()
    return entries.reduce<CongressionalRepresentativeEntry['representative'][]>((acc, entry) => {
        const signature = representativeSignature(entry)
        if (seen.has(signature)) {
            return acc
        }
        seen.add(signature)
        acc.push(entry.representative)
        return acc
    }, [])
}

function districtBucketsForTerm(entries: CongressionalRepresentativeEntry[]): DistrictBucketForTerm[] {
    const byDistrict = new Map<string, CongressionalRepresentativeEntry[]>()
    entries.forEach((entry) => {
        const label = districtLabel(entry)
        const existing = byDistrict.get(label)
        if (existing === undefined) {
            byDistrict.set(label, [entry])
        }
        else {
            existing.push(entry)
        }
    })

    if (byDistrict.size === 0) {
        return [{ districtLabel: 'No district data', representatives: [], signature: '' }]
    }

    return Array.from(byDistrict.entries())
        .map(([label, entriesInDistrict]) => {
            const representatives = uniqueRepresentatives(entriesInDistrict)
            return {
                districtLabel: label,
                representatives,
                signature: representativeListSignature(representatives),
            }
        })
        .sort((a, b) => {
            if (a.signature !== b.signature) {
                return a.signature.localeCompare(b.signature)
            }
            return a.districtLabel.localeCompare(b.districtLabel)
        })
}

function extractCongressionalWidgetData(cellSpecs: CongressionalRegionData[]): {
    termsDescending: number[]
    columns: CongressionalColumnData[]
} | undefined {
    const columns: CongressionalColumnData[] = []
    const termStarts = new Set<number>()

    for (const cell of cellSpecs) {
        columns.push({
            longname: cell.longname ?? '',
            representatives: cell.representatives,
        })
        cell.representatives.forEach((entry: CongressionalRepresentativeEntry) => {
            for (const termStart of termStartsForEntry(entry)) {
                termStarts.add(termStart)
            }
        })
    }

    if (columns.length === 0 || termStarts.size === 0) {
        return undefined
    }

    const termsDescending = Array.from(termStarts).sort((a, b) => b - a)
    return { termsDescending, columns }
}

interface LongnameRun {
    termIndices: number[]
    terms: number[]
    districtBucketsByTerm: DistrictBucketForTerm[][]
}

interface LongnameRuns {
    longname: string
    runs: LongnameRun[]
}

function entriesForTerm(column: CongressionalColumnData, termStart: number): CongressionalRepresentativeEntry[] {
    const seen = new Set<string>()
    return column.representatives.filter((entry) => {
        if (!entryCoversTerm(entry, termStart)) {
            return false
        }
        const key = representativeIdentity(entry)
        if (seen.has(key)) {
            return false
        }
        seen.add(key)
        return true
    })
}

function bucketDistrictLabelPattern(buckets: DistrictBucketForTerm[]): string {
    return buckets.map(bucket => bucket.districtLabel).join('|')
}

function bucketsShareRepresentative(previousBuckets: DistrictBucketForTerm[], currentBuckets: DistrictBucketForTerm[]): boolean {
    const signatures = new Set<string>()
    previousBuckets.forEach((bucket) => {
        bucket.representatives.forEach((representative) => {
            signatures.add(representativeValueSignature(representative))
        })
    })

    return currentBuckets.some(bucket =>
        bucket.representatives.some(representative => signatures.has(representativeValueSignature(representative))),
    )
}

function shouldStartNewSection(previousBuckets: DistrictBucketForTerm[] | undefined, currentBuckets: DistrictBucketForTerm[]): boolean {
    if (previousBuckets === undefined) {
        return true
    }

    if (previousBuckets.length !== currentBuckets.length) {
        return true
    }

    if (bucketDistrictLabelPattern(previousBuckets) !== bucketDistrictLabelPattern(currentBuckets) && !bucketsShareRepresentative(previousBuckets, currentBuckets)) {
        return true
    }

    return false
}

function buildRunsForLongname(column: CongressionalColumnData, termsDescending: number[]): LongnameRuns {
    const districtBucketsByTerm = termsDescending.map(termStart => districtBucketsForTerm(entriesForTerm(column, termStart)))
    const runs: LongnameRun[] = []

    let currentRun: LongnameRun | undefined
    let previousBuckets: DistrictBucketForTerm[] | undefined
    districtBucketsByTerm.forEach((buckets, termIndex) => {
        if (currentRun === undefined || shouldStartNewSection(previousBuckets, buckets)) {
            currentRun = {
                termIndices: [termIndex],
                terms: [termsDescending[termIndex]],
                districtBucketsByTerm: [buckets],
            }
            runs.push(currentRun)
        }
        else {
            currentRun.termIndices.push(termIndex)
            currentRun.terms.push(termsDescending[termIndex])
            currentRun.districtBucketsByTerm.push(buckets)
        }

        previousBuckets = buckets
    })

    return {
        longname: column.longname,
        runs,
    }
}

function findBreakpoints(runsByLongname: LongnameRuns[]): Set<number> {
    const breakpoints = new Set<number>()
    runsByLongname.forEach(({ runs }) => {
        runs.forEach((run) => {
            breakpoints.add(run.termIndices[0])
        })
    })
    return breakpoints
}

function buildDisplayRowMap(termsDescending: number[], breakpoints: Set<number>): {
    displayRows: CongressionalDisplayRow[]
    headerDisplayIndexByTermIndex: Map<number, number>
    termDisplayIndexByTermIndex: Map<number, number>
} {
    const displayRows: CongressionalDisplayRow[] = []
    const headerDisplayIndexByTermIndex = new Map<number, number>()
    const termDisplayIndexByTermIndex = new Map<number, number>()

    termsDescending.forEach((termStart, termIndex) => {
        if (breakpoints.has(termIndex)) {
            headerDisplayIndexByTermIndex.set(termIndex, displayRows.length)
            displayRows.push({ kind: 'header-space', displayIndex: displayRows.length })
        }
        termDisplayIndexByTermIndex.set(termIndex, displayRows.length)
        displayRows.push({ kind: 'term-label', displayIndex: displayRows.length, termStart })
    })

    return {
        displayRows,
        headerDisplayIndexByTermIndex,
        termDisplayIndexByTermIndex,
    }
}

function compactLabels(labels: string[]): string[] {
    return labels.reduce<string[]>((acc, label) => {
        if (acc.length === 0 || acc[acc.length - 1] !== label) {
            acc.push(label)
        }
        return acc
    }, [])
}

function buildDisplayRunsForSection(
    sectionBucketsByTerm: DistrictBucketForTerm[][],
    startTermIndex: number,
    termDisplayIndexByTermIndex: Map<number, number>,
    laneIndex?: number,
): RepresentativesForRegionDistrictAndDisplayRun[] {
    const displayRuns: RepresentativesForRegionDistrictAndDisplayRun[] = []

    sectionBucketsByTerm.forEach((bucketsForTerm, localTermIndex) => {
        const absoluteTermIndex = startTermIndex + localTermIndex
        const displayIndex = termDisplayIndexByTermIndex.get(absoluteTermIndex) ?? 0
        const representatives = laneIndex === undefined
            ? (bucketsForTerm[0]?.representatives ?? [])
            : (bucketsForTerm[laneIndex]?.representatives ?? [])

        const currentRun = {
            representatives,
            startDisplayIndex: displayIndex,
            endDisplayIndex: displayIndex,
        }

        const previousRun = displayRuns[displayRuns.length - 1]
        if (displayRuns.length > 0 && representativeListSignature(previousRun.representatives) === representativeListSignature(currentRun.representatives)) {
            previousRun.endDisplayIndex = currentRun.endDisplayIndex
            return
        }

        displayRuns.push(currentRun)
    })

    return displayRuns
}

function buildDistrictHeadersForSection(sectionBucketsByTerm: DistrictBucketForTerm[][]): string[][] {
    const singleDistrictPerTerm = sectionBucketsByTerm.every(buckets => buckets.length === 1)
    if (singleDistrictPerTerm) {
        return [compactLabels(sectionBucketsByTerm.map(buckets => buckets[0]?.districtLabel ?? 'District unknown'))]
    }

    const laneCount = sectionBucketsByTerm[0]?.length ?? 0
    return Array.from({ length: laneCount }, (_, laneIndex) =>
        compactLabels(sectionBucketsByTerm.map(buckets => buckets[laneIndex]?.districtLabel ?? 'District unknown')),
    )
}

function buildSectionForRun(
    run: LongnameRun,
    termDisplayIndexByTermIndex: Map<number, number>,
    headerDisplayIndexByTermIndex: Map<number, number>,
): RepresentativesForRegionAndDistrictSet {
    const startTermIndex = run.termIndices[0]
    const endTermIndex = run.termIndices[run.termIndices.length - 1]
    const sectionBucketsByTerm = run.districtBucketsByTerm
    const districtHeaders = buildDistrictHeadersForSection(sectionBucketsByTerm)
    const singleDistrictPerTerm = sectionBucketsByTerm.every(buckets => buckets.length === 1)
    const congressionalRuns = singleDistrictPerTerm
        ? [{ displayRuns: buildDisplayRunsForSection(sectionBucketsByTerm, startTermIndex, termDisplayIndexByTermIndex) }]
        : districtHeaders.map((_, laneIndex) => ({
            displayRuns: buildDisplayRunsForSection(sectionBucketsByTerm, startTermIndex, termDisplayIndexByTermIndex, laneIndex),
        }))

    return {
        headerDisplayIndex: headerDisplayIndexByTermIndex.get(startTermIndex),
        contentStartDisplayIndex: termDisplayIndexByTermIndex.get(startTermIndex) ?? 0,
        contentEndDisplayIndex: termDisplayIndexByTermIndex.get(endTermIndex) ?? 0,
        districtHeaders,
        congressionalRuns,
    }
}

function computeCongressionalTableModel(input: {
    termsDescending: number[]
    columns: CongressionalColumnData[]
}): CongressionalTableModel {
    const runsByLongname = input.columns.map(column => buildRunsForLongname(column, input.termsDescending))
    const breakpoints = findBreakpoints(runsByLongname)
    const { displayRows, headerDisplayIndexByTermIndex, termDisplayIndexByTermIndex } = buildDisplayRowMap(input.termsDescending, breakpoints)

    const supercolumns: RepresentativesForRegion[] = runsByLongname.map(({ longname, runs }) => ({
        longname,
        sections: runs.map(run => buildSectionForRun(run, termDisplayIndexByTermIndex, headerDisplayIndexByTermIndex)),
    }))

    return {
        displayRows,
        supercolumns,
    }
}

export function computeCongressionalWidgetModel(cellSpecs: CongressionalRegionData[]): CongressionalTableModel | undefined {
    const extracted = extractCongressionalWidgetData(cellSpecs)
    if (extracted === undefined) {
        return undefined
    }
    return computeCongressionalTableModel(extracted)
}
