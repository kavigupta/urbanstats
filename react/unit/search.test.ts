import { test } from 'uvu'
import * as assert from 'uvu/assert'

import './util/fetch'
import { createIndex } from '../src/search'

const search = await createIndex()

// We curry based on testFn so we can use test.only, test.skip, etc
const firstResult = (testFn: (name: string, testBlock: () => void) => void) => (query: string, result: string): void => {
    testFn(`First result for '${query}' is '${result}'`, () => {
        assert.is(search({ unnormalizedPattern: query, maxResults: 10, showHistoricalCDs: false })[0], result)
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
firstResult(test)('nv usa', 'NV-04, USA') // Nevada, USA or a NV-??
firstResult(test)('usa', 'USA')
firstResult(test)('london', 'London Urban Center, United Kingdom')
firstResult(test)('berlin', 'Berlin, Germany')
firstResult(test)('los angeles urban area', 'Los Angeles-Long Beach-Anaheim [Urban Area], CA, USA')
firstResult(test)('san marino', 'San Marino') // Should not be "San Marino, San Marino"
firstResult(test)('queens', 'Queens County, New York, USA')
firstResult(test)('india', 'India')
firstResult(test)('urban center', 'Guangzhou Urban Center, China') // Should be some Urban Center
firstResult(test)('urban area', 'Chicago [Urban Area], IL-IN, USA') // Should be some Urban Area
firstResult(test)('msa', 'Pittsburgh MSA, PA, USA') // Should be some MSA
firstResult(test)('dalas', 'Dallas Urban Center, USA') // Correct for misspelling
firstResult(test)('ventura city', 'San Buenaventura (Ventura) city, California, USA') // handles alias
firstResult(test)('san francisco urban', 'San Francisco-Oakland [Urban Area], CA, USA') // symbols treated as separate tokens (i.e., [Urban Area] shuold be treated as [ Urban Area ])
firstResult(test)('los angeles center 5', 'Los Angeles (Center East) 5MPC, USA') // I think same as above
firstResult(test)('france-germany', 'Strasbourg Urban Center, Germany-France') // reach test, should find something in both

test.run()
