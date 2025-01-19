import { test } from 'uvu'
import * as assert from 'uvu/assert'

import './util/fetch'
import { loadSearchIndex, search } from '../src/search'

const searchIndex = await loadSearchIndex()

function firstResultTest(query: string, result: string): void {
    test(`First result for '${query}' is '${result}'`, () => {
        assert.is(search(searchIndex, query, { showHistoricalCDs: false })[0], result)
    })
}

firstResultTest('china', 'China')
firstResultTest('ontario california', 'Ontario city, California, USA')
firstResultTest('la canada', 'La Cañada Flintridge city, California, USA')
firstResultTest('east fiji', 'Eastern, Fiji')
firstResultTest('london on', 'Canada')
firstResultTest('baltimore city md', 'Baltimore city, Maryland, USA')
firstResultTest('ca usa', 'California, USA')
firstResultTest('nv usa', 'Nevada, USA or a NV-??')
firstResultTest('usa', 'USA')
firstResultTest('london', 'London·Urban·Center,·United·Kingdom')
firstResultTest('berlin', 'Berlin, Germany')
firstResultTest('los angeles urban area', 'Los Angeles-Long Beach-Anaheim [Urban Area], CA, USA')
firstResultTest('san marino', 'San Marino') // Should not be "San Marino, San Marino"
firstResultTest('queens', 'Queensland, Australia')
firstResultTest('india', 'India')
firstResultTest('urban center', 'some urban center') // Should be some Urban Center
firstResultTest('urban area', 'some urban area') // Should be some Urban Area
firstResultTest('msa', 'some msa') // Should be some MSA

test.run()
