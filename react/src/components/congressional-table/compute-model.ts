import {
    CongressionalColumnData,
    CongressionalRepresentativeEntry,
    CongressionalRunModel,
    CongressionalSupercolumn,
    CongressionalTableModel,
    DistrictConfigurationSection,
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
    const terms = []
    for (let term = startTerm; term < endTerm; term += 2) {
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
    return termStart >= startTerm && termStart < endTerm && (termStart - startTerm) % 2 === 0
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

    const headerStartByColumnAndTerm = districtBucketsByColumnAndTerm.map((bucketsByTerm) => {
        const starts = new Set<number>()
        let previousDistrictSignature: string | null = null
        bucketsByTerm.forEach((buckets, termIndex) => {
            const signature = buckets.map(bucket => bucket.districtLabel).join('||')
            if (termIndex === 0 || signature !== previousDistrictSignature) {
                starts.add(termIndex)
            }
            previousDistrictSignature = signature
        })
        return starts
    })

    const headerStartCountByTerm = new Map<number, number>()
    headerStartByColumnAndTerm.forEach((starts) => {
        starts.forEach((termIndex) => {
            headerStartCountByTerm.set(termIndex, (headerStartCountByTerm.get(termIndex) ?? 0) + 1)
        })
    })

    const headerStartTermIndices = new Set<number>()
    for (let termIndex = 0; termIndex < input.termsDescending.length; termIndex += 1) {
        const headerCount = headerStartCountByTerm.get(termIndex) ?? 0
        if (input.columns.length === 1 ? headerCount >= 1 : headerCount >= 2) {
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

    const supercolumns: CongressionalSupercolumn[] = input.columns.map((column, columnIndex) => {
        const sectionStarts = Array.from(headerStartByColumnAndTerm[columnIndex].values()).sort((a, b) => a - b)
        const sections: DistrictConfigurationSection[] = sectionStarts.map((startTermIndex, startIdx) => {
            const endTermIndex = startIdx === sectionStarts.length - 1
                ? input.termsDescending.length - 1
                : sectionStarts[startIdx + 1] - 1
            const sectionBucketsByTerm = districtBucketsByColumnAndTerm[columnIndex].slice(startTermIndex, endTermIndex + 1)
            const districtHeaders = [sectionBucketsByTerm[0].map(bucket => bucket.districtLabel)]

            const congressionalRuns: CongressionalRunModel[] = districtHeaders[0].map((district) => {
                const representativeOrder: string[] = []
                const representativeById = new Map<string, CongressionalRepresentativeEntry['representative']>()
                const termCountById = new Map<string, number>()
                const termsById = new Map<string, number[]>()

                sectionBucketsByTerm.forEach((bucketsForTerm, localTermIndex) => {
                    const absoluteTermIndex = startTermIndex + localTermIndex
                    const termStart = input.termsDescending[absoluteTermIndex]
                    const entriesInDistrict = bucketsForTerm.find(bucket => bucket.districtLabel === district)?.entries ?? []
                    const uniqueIdsForTerm = new Set<string>()

                    entriesInDistrict.forEach((entry) => {
                        const id = representativeSignature(entry)
                        if (uniqueIdsForTerm.has(id)) {
                            return
                        }
                        uniqueIdsForTerm.add(id)
                        if (!representativeById.has(id)) {
                            representativeById.set(id, entry.representative)
                            representativeOrder.push(id)
                            termCountById.set(id, 0)
                            termsById.set(id, [])
                        }
                        termCountById.set(id, (termCountById.get(id) ?? 0) + 1)
                        termsById.get(id)?.push(termStart)
                    })
                })

                return {
                    representatives: representativeOrder.map(id => representativeById.get(id)).filter((r): r is CongressionalRepresentativeEntry['representative'] => r !== undefined),
                    termCounts: representativeOrder.map(id => termCountById.get(id) ?? 0),
                    termsByRepresentative: representativeOrder.map(id => termsById.get(id) ?? []),
                }
            })

            return {
                startTermIndex,
                endTermIndex,
                headerDisplayIndex: headerStartTermIndices.has(startTermIndex)
                    ? headerDisplayRowByTerm.get(startTermIndex)
                    : undefined,
                contentStartDisplayIndex: termLabelDisplayRowByTerm.get(startTermIndex) ?? 0,
                contentEndDisplayIndex: termLabelDisplayRowByTerm.get(endTermIndex) ?? 0,
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
