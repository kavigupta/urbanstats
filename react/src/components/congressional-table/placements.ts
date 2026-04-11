import { CongressionalRepresentativeEntry, RepresentativesForRegionAndDistrict } from './model'

export interface RepresentativePlacement {
    representative: CongressionalRepresentativeEntry['representative']
    key: string
    rowStart: number
    spanCount: number
}

export function computeRepresentativePlacements(input: {
    run: RepresentativesForRegionAndDistrict
    sectionStartTermIndex: number
    sectionTermCount: number
    columnIndex: number
    bucketIndex: number
    startTermIndex: number
    termIndexByStart: Map<number, number>
}): RepresentativePlacement[] {
    return input.run.representatives.flatMap((representative, entryIndex) => {
        const terms = input.run.termsByRepresentative[entryIndex] ?? []
        const sectionRelativeTermRows = terms
            .map(termStart => input.termIndexByStart.get(termStart))
            .filter((termIndex): termIndex is number => termIndex !== undefined)
            .map(termIndex => termIndex - input.sectionStartTermIndex + 1)
            .filter(termRow => termRow >= 1 && termRow <= input.sectionTermCount)
            .sort((a, b) => a - b)

        if (sectionRelativeTermRows.length === 0) {
            return [{
                representative,
                key: `rep_${input.columnIndex}_${input.startTermIndex}_${input.bucketIndex}_${entryIndex}_fallback`,
                rowStart: input.run.termCounts.slice(0, entryIndex).reduce((a, b) => a + b, 0) + 1,
                spanCount: 1,
            }]
        }

        return sectionRelativeTermRows.map((rowStart, rowIndex) => ({
            representative,
            key: `rep_${input.columnIndex}_${input.startTermIndex}_${input.bucketIndex}_${entryIndex}_term_${rowIndex}`,
            rowStart,
            spanCount: 1,
        }))
    })
}
