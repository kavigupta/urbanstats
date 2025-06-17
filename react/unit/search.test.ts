import assert from 'assert/strict'
import { test } from 'node:test'

import type_ordering_idx from '../src/data/type_ordering_idx'
import './util/fetch'
import { createIndex, SearchResult } from '../src/search'

const search = await createIndex(undefined)

const computeFirstResult = (query: string, prioritizeType: string | undefined): SearchResult => search({
    unnormalizedPattern: query,
    maxResults: 10,
    showHistoricalCDs: false,
    prioritizeTypeIndex: prioritizeType !== undefined ? type_ordering_idx[prioritizeType] : undefined,
})[0]

// We curry based on testFn so we can use test.only, test.skip, etc
const firstResult = (testFn: (name: string, testBlock: () => void) => void) => (query: string, result: string, prioritizeType?: string): void => {
    testFn(`First result for '${query}' ${prioritizeType !== undefined ? `(Prioritizing ${prioritizeType}) ` : ''}is '${result}'`, () => {
        assert.equal(computeFirstResult(query, prioritizeType).longname, result)
    })
}

firstResult(test)('china', 'China')
firstResult(test)('ontario california', 'Ontario city, California, USA')
firstResult(test)('onatrio california', 'Ontario city, California, USA') // Letter flip
firstResult(test)('la canada', 'La Cañada Flintridge city, California, USA')
firstResult(test)('east fiji', 'Eastern, Fiji')
firstResult(test)('london on', 'London Population Center, ON, Canada') // Something in canada
firstResult(test)('baltimore city md', 'Baltimore city, Maryland, USA')
firstResult(test)('ca usa', 'California, USA')
firstResult(test)('usa', 'USA')
firstResult(test)('london', 'London Population Center, ON, Canada')
firstResult(test)('berlin', 'Berlin, Germany')
firstResult(test)('los angeles', 'Los Angeles city, California, USA')
firstResult(test)('los angeles urban area', 'Los Angeles-Long Beach-Anaheim [Urban Area], CA, USA')
firstResult(test)('san marino', 'San Marino') // Should not be "San Marino, San Marino"
firstResult(test)('queens', 'Queens County, New York, USA')
firstResult(test)('india', 'India')
firstResult(test)('urban center', 'Guangzhou Urban Center, China') // Should be some Urban Center
firstResult(test)('urban area', 'Chicago [Urban Area], IL-IN, USA') // Should be some Urban Area
firstResult(test)('msa', 'Pittsburgh MSA, PA, USA') // Should be some MSA
firstResult(test)('dalas', 'Dallas city, Texas, USA') // Correct for misspelling
firstResult(test)('ventura city', 'San Buenaventura (Ventura) city, California, USA') // handles alias
firstResult(test)('france-germany', 'Saarbrücken Metropolitan Cluster, Germany-France') // reach test, should find something in both
firstResult(test)('united states of america', 'United States of America') // symlink

firstResult(test)('san jose', 'San Jose city, California, USA', 'City')
firstResult(test)('london', 'London Population Center, ON, Canada', 'CA Population Center')
firstResult(test)('berlin', 'Berlin Urban Center, Germany', 'Urban Center')
