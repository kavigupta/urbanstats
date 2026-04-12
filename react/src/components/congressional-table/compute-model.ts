import {
    CongressionalColumnData,
    CongressionalRepresentativeEntry,
    RepresentativesForRegionAndDistrict,
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
    const startTerm = entry.startTerm
    if (startTerm === undefined) {
        return []
    }
    const endTerm = entry.endTerm
    if (endTerm === undefined || endTerm <= startTerm) {
        return [startTerm]
    }
    const terms: number[] = []
    for (let term = startTerm; term <= endTerm; term += 2) {
        terms.push(term)
    }
    return terms.length > 0 ? terms : [startTerm]
}

function entryCoversTerm(entry: CongressionalRepresentativeEntry, termStart: number): boolean {
    const startTerm = entry.startTerm
    if (startTerm === undefined) {
        return false
    }
    const endTerm = entry.endTerm
    if (endTerm === undefined || endTerm <= startTerm) {
        return termStart === startTerm
    }
    return termStart >= startTerm && termStart <= endTerm && (termStart - startTerm) % 2 === 0
}

function representativeIdentity(entry: CongressionalRepresentativeEntry): string {
    return `${entry.representative.name ?? ''}|${entry.districtLongname ?? ''}|${entry.startTerm ?? ''}|${entry.endTerm ?? ''}`
}

function districtLabel(entry: CongressionalRepresentativeEntry): string {
    return entry.districtLongname ?? 'District unknown'
}

interface DistrictBucketForTerm {
    districtLabel: string
    entries: CongressionalRepresentativeEntry[]
    signature: string
}

function representativeSignature(entry: CongressionalRepresentativeEntry): string {
    return `${entry.representative.name ?? ''}|${entry.representative.wikipediaPage ?? ''}|${entry.representative.party ?? ''}`
}

function districtBucketSignature(entries: CongressionalRepresentativeEntry[]): string {
    return entries.map(entry => representativeSignature(entry)).sort((a, b) => a.localeCompare(b)).join('||')
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
        return [{ districtLabel: 'No district data', entries: [], signature: '' }]
    }

    return Array.from(byDistrict.entries())
        .map(([label, entriesInDistrict]) => ({
            districtLabel: label,
            entries: entriesInDistrict,
            signature: districtBucketSignature(entriesInDistrict),
        }))
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

function computeCongressionalTableModel(input: {
    termsDescending: number[]
    columns: CongressionalColumnData[]
}): CongressionalTableModel {
    const entriesForTerm = (column: CongressionalColumnData, termStart: number): CongressionalRepresentativeEntry[] => {
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

    const entriesByColumnAndTerm = input.columns.map(column =>
        input.termsDescending.map(termStart => entriesForTerm(column, termStart)),
    )

    const districtBucketsByColumnAndTerm = entriesByColumnAndTerm.map(entriesByTerm =>
        entriesByTerm.map(entries => districtBucketsForTerm(entries)),
    )

    const sectionStartByColumnAndTerm = districtBucketsByColumnAndTerm.map((bucketsByTerm) => {
        const starts = new Set<number>()
        let previousSectionPattern: string | null = null
        bucketsByTerm.forEach((buckets, termIndex) => {
            const representativeCountPattern = buckets.map(bucket => bucket.entries.length).join('|')
            const sectionPattern = buckets.length <= 1
                ? `count:${representativeCountPattern}`
                : `count:${representativeCountPattern};topology:${buckets.map(bucket => `${bucket.districtLabel}::${bucket.signature}`).join('|')}`
            if (termIndex === 0 || sectionPattern !== previousSectionPattern) {
                starts.add(termIndex)
            }
            previousSectionPattern = sectionPattern
        })
        return starts
    })

    const headerStartCountByTerm = new Map<number, number>()
    sectionStartByColumnAndTerm.forEach((starts) => {
        starts.forEach((termIndex) => {
            headerStartCountByTerm.set(termIndex, (headerStartCountByTerm.get(termIndex) ?? 0) + 1)
        })
    })

    const headerStartTermIndices = new Set<number>()
    for (let termIndex = 0; termIndex < input.termsDescending.length; termIndex += 1) {
        const headerCount = headerStartCountByTerm.get(termIndex) ?? 0
        if (headerCount >= 1) {
            headerStartTermIndices.add(termIndex)
        }
    }

    const displayRows: CongressionalDisplayRow[] = []
    const headerDisplayRowByTerm = new Map<number, number>()
    const termLabelDisplayRowByTerm = new Map<number, number>()
    for (let termIndex = 0; termIndex < input.termsDescending.length; termIndex += 1) {
        if (headerStartTermIndices.has(termIndex)) {
            headerDisplayRowByTerm.set(termIndex, displayRows.length)
            displayRows.push({ kind: 'header-space', termIndex })
        }
        termLabelDisplayRowByTerm.set(termIndex, displayRows.length)
        displayRows.push({ kind: 'term-label', termIndex, termStart: input.termsDescending[termIndex] })
    }

    const supercolumns: RepresentativesForRegion[] = input.columns.map((column, columnIndex) => {
        const sectionStarts = Array.from(sectionStartByColumnAndTerm[columnIndex].values()).sort((a, b) => a - b)
        const sections: RepresentativesForRegionAndDistrictSet[] = sectionStarts.map((startIndex, startIdx) => {
            const endIndex = startIdx === sectionStarts.length - 1
                ? input.termsDescending.length - 1
                : sectionStarts[startIdx + 1] - 1
            const sectionBucketsByTerm = districtBucketsByColumnAndTerm[columnIndex].slice(startIndex, endIndex + 1)
            const buildRunForSection = (district?: string): RepresentativesForRegionAndDistrict => {
                const displayRuns: RepresentativesForRegionDistrictAndDisplayRun[] = sectionBucketsByTerm.map((bucketsForTerm, localTermIndex) => {
                    const absoluteTermIndex = startIndex + localTermIndex
                    const displayIndex = termLabelDisplayRowByTerm.get(absoluteTermIndex) ?? 0
                    const entriesInDistrict: CongressionalRepresentativeEntry[] = district === undefined
                        ? bucketsForTerm.reduce<CongressionalRepresentativeEntry[]>((acc, bucket) => {
                            acc.push(...bucket.entries)
                            return acc
                        }, [])
                        : bucketsForTerm.find(bucket => bucket.districtLabel === district)?.entries ?? []
                    const uniqueIdsForTerm = new Set<string>()
                    const representatives = entriesInDistrict.reduce<CongressionalRepresentativeEntry['representative'][]>((acc, entry) => {
                        const id = representativeSignature(entry)
                        if (uniqueIdsForTerm.has(id)) {
                            return acc
                        }
                        uniqueIdsForTerm.add(id)
                        acc.push(entry.representative)
                        return acc
                    }, [])

                    return {
                        representatives,
                        startDisplayIndex: displayIndex,
                        endDisplayIndex: displayIndex,
                    }
                })

                const compressedDisplayRuns = displayRuns.reduce<RepresentativesForRegionDistrictAndDisplayRun[]>((acc, displayRun) => {
                    if (acc.length === 0) {
                        acc.push(displayRun)
                        return acc
                    }

                    const previous = acc[acc.length - 1]
                    const previousSignature = previous.representatives
                        .map(representative => `${representative.name ?? ''}|${representative.wikipediaPage ?? ''}|${representative.party ?? ''}`)
                        .join('||')
                    const currentSignature = displayRun.representatives
                        .map(representative => `${representative.name ?? ''}|${representative.wikipediaPage ?? ''}|${representative.party ?? ''}`)
                        .join('||')
                    const isContiguousDisplayRange = previous.endDisplayIndex + 1 === displayRun.startDisplayIndex

                    if (previousSignature === currentSignature && isContiguousDisplayRange) {
                        previous.endDisplayIndex = displayRun.endDisplayIndex
                        return acc
                    }

                    acc.push(displayRun)
                    return acc
                }, [])

                return {
                    displayRuns: compressedDisplayRuns,
                }
            }

            const singleDistrictPerTerm = sectionBucketsByTerm.every(buckets => buckets.length === 1)
            const districtHeaders = singleDistrictPerTerm
                ? [
                        sectionBucketsByTerm
                            .map(buckets => buckets[0].districtLabel)
                            .reduce<string[]>((acc, district) => {
                                if (acc.length === 0 || acc[acc.length - 1] !== district) {
                                    acc.push(district)
                                }
                                return acc
                            }, []),
                    ]
                : sectionBucketsByTerm[0].map(bucket => [bucket.districtLabel])

            const congressionalRuns: RepresentativesForRegionAndDistrict[] = singleDistrictPerTerm
                ? [buildRunForSection()]
                : districtHeaders.map(headerGroup => buildRunForSection(headerGroup[0]))

            return {
                headerDisplayIndex: headerStartTermIndices.has(startIndex)
                    ? headerDisplayRowByTerm.get(startIndex)
                    : undefined,
                contentStartDisplayIndex: termLabelDisplayRowByTerm.get(startIndex) ?? 0,
                contentEndDisplayIndex: termLabelDisplayRowByTerm.get(endIndex) ?? 0,
                districtHeaders,
                congressionalRuns,
            }
        })

        return {
            longname: column.longname,
            sections,
        }
    })

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
