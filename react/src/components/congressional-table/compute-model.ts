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
    longname: string
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

function districtLabel(entry: CongressionalRepresentativeEntry): string {
    return entry.districtLongname ?? 'District unknown'
}

interface DistrictBucketForTerm {
    districtLabel: string
    representatives: CongressionalRepresentativeEntry['representative'][]
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
        return [{ districtLabel: 'No district data', representatives: [] }]
    }

    return Array.from(byDistrict.entries())
        .map(([label, entriesInDistrict]) => {
            const representatives = uniqueRepresentatives(entriesInDistrict)
            return {
                districtLabel: label,
                representatives,
            }
        })
        .sort((a, b) => a.districtLabel.localeCompare(b.districtLabel))
}

function computeTermsDescending(cellSpecs: CongressionalRegionData[]): number[] {
    const termStarts = new Set<number>()

    for (const cell of cellSpecs) {
        cell.representatives.forEach((entry: CongressionalRepresentativeEntry) => {
            for (const termStart of termStartsForEntry(entry)) {
                termStarts.add(termStart)
            }
        })
    }
    const termsDescending = Array.from(termStarts).sort((a, b) => b - a)
    return termsDescending
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
        const key = JSON.stringify(entry)
        if (seen.has(key)) {
            return false
        }
        seen.add(key)
        return true
    })
}

function representativeSignatureSet(buckets: DistrictBucketForTerm[]): Set<string> {
    const representatives = new Set<string>()
    buckets.forEach((bucket) => {
        bucket.representatives.forEach((representative) => {
            representatives.add(representativeValueSignature(representative))
        })
    })
    return representatives
}

function bucketsSameRepresentatives(previousBuckets: DistrictBucketForTerm[], currentBuckets: DistrictBucketForTerm[]): boolean {
    const previousSignatures = representativeSignatureSet(previousBuckets)
    const currentSignatures = representativeSignatureSet(currentBuckets)
    return previousSignatures.size === currentSignatures.size
        && Array.from(previousSignatures).every(sig => currentSignatures.has(sig))
}

export function cleanDistrictLabel(label: string): string {
    return label.replace(/\s*\(\d{4}\), USA$/g, '').trim()
}

function districtLabelsMatch(label1: string, label2: string): boolean {
    // strip out any year labels in the districts
    const cleanLabel1 = cleanDistrictLabel(label1)
    const cleanLabel2 = cleanDistrictLabel(label2)
    return cleanLabel1 === cleanLabel2
}

function attemptAlign(startBuckets: DistrictBucketForTerm[] | undefined, currentBuckets: DistrictBucketForTerm[]): {
    newBuckets: DistrictBucketForTerm[]
    isAligned: boolean
} {
    if (startBuckets === undefined || startBuckets.length !== currentBuckets.length) {
        // don't even attempt to unify, since the number of districts is different
        // there's no visual continuity anyway.
        return { newBuckets: currentBuckets, isAligned: false }
    }

    const remainingIndices = new Set(currentBuckets.map((_, index) => index))
    const newBuckets: (DistrictBucketForTerm | undefined)[] = startBuckets.map(() => undefined)
    // align buckets based on district label first.
    for (const [startIdex, startBucket] of startBuckets.entries()) {
        const matchIndex = currentBuckets.findIndex((bucket, candidateIndex) =>
            districtLabelsMatch(bucket.districtLabel, startBucket.districtLabel) && remainingIndices.has(candidateIndex),
        )
        if (matchIndex !== -1) {
            newBuckets[startIdex] = currentBuckets[matchIndex]
            remainingIndices.delete(matchIndex)
            continue
        }
    }
    // then attempt to align remaining buckets based on representative signatures, if labels didn't match.
    for (const [startIdex, startBucket] of startBuckets.entries()) {
        if (newBuckets[startIdex] !== undefined) {
            continue
        }
        // console.log('attempting to align with', JSON.stringify(startBucket))
        const matchIndex = currentBuckets.findIndex((bucket, candidateIndex) =>
            bucketsSameRepresentatives([bucket], [startBucket])
            && remainingIndices.has(candidateIndex),
        )
        if (matchIndex !== -1) {
            newBuckets[startIdex] = currentBuckets[matchIndex]
            remainingIndices.delete(matchIndex)
        }
    }

    const isAligned = remainingIndices.size === 0
    const remainingIndicesList = Array.from(remainingIndices).sort((a, b) => a - b)
    let nextUnmatchedIndex = 0
    for (let i = 0; i < newBuckets.length; i++) {
        if (newBuckets[i] === undefined) {
            newBuckets[i] = currentBuckets[remainingIndicesList[nextUnmatchedIndex]]
            nextUnmatchedIndex++
        }
    }
    assert(newBuckets.every(bucket => bucket !== undefined), 'All buckets should be filled in at this point')
    return { newBuckets, isAligned }
}

function buildRunsForLongname(column: CongressionalColumnData, termsDescending: number[]): LongnameRuns {
    const districtBucketsByTerm = termsDescending.map(termStart => districtBucketsForTerm(entriesForTerm(column, termStart)))
    const runs: LongnameRun[] = []

    let startOfCurrentRunBuckets: DistrictBucketForTerm[] | undefined = undefined

    districtBucketsByTerm.forEach((buckets, termIndex) => {
        const { newBuckets, isAligned } = attemptAlign(startOfCurrentRunBuckets, buckets)
        if (!isAligned) {
            runs.push({ termIndices: [], terms: [], districtBucketsByTerm: [] })
            startOfCurrentRunBuckets = newBuckets
        }
        const currentRun = runs[runs.length - 1]
        currentRun.termIndices.push(termIndex)
        currentRun.terms.push(termsDescending[termIndex])
        currentRun.districtBucketsByTerm.push(newBuckets)
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

export function computeCongressionalWidgetModel(cellSpecs: CongressionalRegionData[]): CongressionalTableModel {
    const termsDescending = computeTermsDescending(cellSpecs)
    const runsByLongname = cellSpecs.map(cell => buildRunsForLongname(cell, termsDescending))
    const breakpoints = findBreakpoints(runsByLongname)
    const { displayRows, headerDisplayIndexByTermIndex, termDisplayIndexByTermIndex } = buildDisplayRowMap(termsDescending, breakpoints)

    const supercolumns: RepresentativesForRegion[] = runsByLongname.map(({ longname, runs }) => ({
        longname,
        sections: runs.map(run => buildSectionForRun(run, termDisplayIndexByTermIndex, headerDisplayIndexByTermIndex)),
    }))

    return {
        displayRows,
        supercolumns,
    }
}
