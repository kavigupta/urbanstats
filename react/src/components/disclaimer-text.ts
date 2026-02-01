export type Disclaimer = 'heterogenous-sources' | 'election-small-region' | 'election-swing-small-region'

/**
 * Returns election disclaimer when appropriate: election-small-region for Presidential Election-margin when population < 5000,
 * election-swing-small-region for Swing-margin when population < 10000.
 */
export function electionDisclaimerForRow(statpath: string | undefined, population: number | null): Disclaimer | undefined {
    if (!statpath || population === null || Number.isNaN(population)) {
        return undefined
    }
    if (statpath.includes('Presidential Election-margin') && population < 5000) {
        return 'election-small-region'
    }
    if (statpath.includes('Swing-margin') && population < 10000) {
        return 'election-swing-small-region'
    }
    return undefined
}

export function computeDisclaimerText(disclaimer: Disclaimer): string {
    switch (disclaimer) {
        case 'heterogenous-sources':
            return 'This statistic is based on data from multiple sources, which may not be consistent with each other.'
        case 'election-small-region':
            return 'Election results based on disaggregation from precincts, might have inaccuracies for small regions'
        case 'election-swing-small-region':
            return 'Election results based on disaggregation from precincts, swings in particular might reflect changes in precinct disaggregation for small regions'
    }
}
