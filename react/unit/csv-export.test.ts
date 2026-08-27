import assert from 'assert/strict'
import { describe, mock, test } from 'node:test'

import './util/localStorage'
import './util/window'
import { HumanReadableName } from '../src/utils/human-readable-element'
import { ReaderSettings } from '../src/utils/quantity'
import { storedUnits } from '../src/utils/unit'

// The rows are built without either, but csv-export imports the button that hands the file to the
// browser, and the settings behind it pull in the router.
mock.module('file-saver', { namedExports: { saveAs: () => undefined } })
mock.module('../src/navigation/Navigator', { namedExports: { Navigator: {} } })
const { generateStatisticsPanelCSVData } = await import('../src/components/csv-export')

const column = {
    name: [
        { type: 'atom' as const, value: 'Counties where Mean high temp > ' },
        { type: 'quantity' as const, value: 80, unit: storedUnits.temperature },
    ] satisfies HumanReadableName,
    value: [1],
    ordinal: [1],
    populationPercentile: [50],
}

void describe('the statistics panel CSV', () => {
    void test('heads a column in the units the reader downloading it uses', () => {
        const header = (settings: ReaderSettings): string[] =>
            generateStatisticsPanelCSVData(['Alameda County, California, USA'], [column], true, settings)[0]
        assert.deepEqual(header({}), ['Name', 'Counties where Mean high temp > 80°F'])
        assert.deepEqual(header({ temperatureUnit: 'celsius' }), ['Name', 'Counties where Mean high temp > 26.7°C'])
    })
})
