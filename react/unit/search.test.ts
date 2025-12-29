import assert from 'assert/strict'
import { test } from 'node:test'

import { computeStatisticsPages } from '../src/components/search-statistic'
import type_ordering_idx from '../src/data/type_ordering_idx'
import './util/fetch'
import { createIndex, SearchResult } from '../src/search'

const search = await createIndex(undefined)
const [forAll] = (await computeStatisticsPages(true, undefined))!
const [forCanada] = (await computeStatisticsPages(true, 'Canada'))!

const extraStringsByKey = {
    all: forAll,
    canada: forCanada,
} as const

type ExtraStringKey = keyof typeof extraStringsByKey

const computeNthResult = (n: number, query: string, prioritizeType: string | undefined, extraStringKey?: ExtraStringKey): SearchResult => search({
    unnormalizedPattern: query,
    maxResults: 10,
    showSettings: {
        show_historical_cds: false,
        show_person_circles: true,
    },
    prioritizeTypeIndex: prioritizeType !== undefined ? type_ordering_idx[prioritizeType] : undefined,
    extraStrings: extraStringKey !== undefined ? extraStringsByKey[extraStringKey] : undefined,
})[n]

// We curry based on testFn so we can use test.only, test.skip, etc
const nthResult = (testFn: (name: string, testBlock: () => void) => void) => (n: number, query: string, result: string, prioritizeType?: string, extraStringKey?: ExtraStringKey): void => {
    const parentheticalElements = []
    if (prioritizeType !== undefined) {
        parentheticalElements.push(`Prioritizing ${prioritizeType}`)
    }
    if (extraStringKey !== undefined) {
        parentheticalElements.push(`Extra string key: ${extraStringKey}`)
    }
    const parenthetical = parentheticalElements.length > 0 ? ` (${parentheticalElements.join(', ')})` : ''

    testFn(`result ${n} for '${query}'${parenthetical} is '${result}'`, () => {
        assert.equal(computeNthResult(n, query, prioritizeType, extraStringKey).longname, result)
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

nthResult(test)(0, 'white city', 'White Plains city, New York, USA')
nthResult(test)(0, 'white city', 'White % by City', undefined, 'all')
nthResult(test)(0, 'white city', 'White Plains city, New York, USA', undefined, 'canada') // white % by city should not match anything in canada
nthResult(test)(0, 'by population center', 'Thunder Bay Population Center, ON, Canada')
nthResult(test)(0, 'by population center', 'Area by CA Population Center', undefined, 'all')
nthResult(test)(0, 'by population center', 'Area by CA Population Center', undefined, 'canada')
