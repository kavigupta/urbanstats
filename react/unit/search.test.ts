import assert from 'assert/strict'
import { test } from 'node:test'

import type_ordering_idx from '../src/data/type_ordering_idx'
import './util/fetch'
import { createIndex, SearchResult } from '../src/search'

const search = await createIndex(undefined)

const computeNthResult = (n: number, query: string, prioritizeType: string | undefined): SearchResult => search({
    unnormalizedPattern: query,
    maxResults: 10,
    showHistoricalCDs: false,
    prioritizeTypeIndex: prioritizeType !== undefined ? type_ordering_idx[prioritizeType] : undefined,
})[n]

// We curry based on testFn so we can use test.only, test.skip, etc
const nthResult = (testFn: (name: string, testBlock: () => void) => void) => (n: number, query: string, result: string, prioritizeType?: string): void => {
    testFn(`result ${n} for '${query}' ${prioritizeType !== undefined ? `(Prioritizing ${prioritizeType}) ` : ''}is '${result}'`, () => {
        assert.equal(computeNthResult(n, query, prioritizeType).longname, result)
    })
}

nthResult(test)(0, 'china', 'China')
nthResult(test)(0, 'ontario california', 'Ontario city, California, USA')
nthResult(test)(0, 'onatrio california', 'Ontario city, California, USA') // Letter flip
nthResult(test)(0, 'la canada', 'La Cañada Flintridge city, California, USA')
nthResult(test)(0, 'east fiji', 'Eastern, Fiji')
nthResult(test)(0, 'london on', 'London Population Center, ON, Canada') // Something in canada
nthResult(test)(0, 'baltimore city md', 'Baltimore city, Maryland, USA')
nthResult(test)(0, 'ca usa', 'California, USA')
nthResult(test)(0, 'usa', 'USA')
nthResult(test)(0, 'london', 'London Population Center, ON, Canada')
nthResult(test)(0, 'berlin', 'Berlin, Germany')
nthResult(test)(0, 'los angeles', 'Los Angeles city, California, USA')
nthResult(test)(0, 'los angeles urban area', 'Los Angeles-Long Beach-Anaheim [Urban Area], CA, USA')
nthResult(test)(0, 'san marino', 'San Marino') // Should not be "San Marino, San Marino"
nthResult(test)(0, 'queens', 'Queens County, New York, USA')
nthResult(test)(0, 'india', 'India')
nthResult(test)(0, 'urban center', 'Guangzhou Urban Center, China') // Should be some Urban Center
nthResult(test)(0, 'urban area', 'Chicago [Urban Area], IL-IN, USA') // Should be some Urban Area
nthResult(test)(0, 'msa', 'Pittsburgh MSA, PA, USA') // Should be some MSA
nthResult(test)(0, 'dalas', 'Dallas city, Texas, USA') // Correct for misspelling
nthResult(test)(0, 'ventura city', 'San Buenaventura (Ventura) city, California, USA') // handles alias
nthResult(test)(0, 'france-germany', 'Saarbrücken Metropolitan Cluster, Germany-France') // reach test, should find something in both
nthResult(test)(0, 'united states of america', 'United States of America') // symlink

nthResult(test)(0, 'san jose', 'San Jose city, California, USA', 'City')
nthResult(test)(0, 'london', 'London Population Center, ON, Canada', 'CA Population Center')
nthResult(test)(1, 'berlin', 'Berlin Urban Center, Germany', 'Urban Center')
nthResult(test)(1, 'virginia', 'Virginia, USA', 'City')
