import assert from 'assert/strict'
import { test, mock } from 'node:test'

import './util/fetch'

// Needs to be in a separate file (with process isolation mode) for dynamic imports and mocking to work
void test('handles index partitions error', async () => {
    mock.module('../src/utils/partition', {
        namedExports: {
            bestPartition: () => {
                throw new RangeError()
            },
        },
    })

    const dynamic = await import('../src/map-partition')

    assert.deepEqual(
        await dynamic.partitionLongnames(
            ['Cal Young Neighborhood, Eugene City, Oregon, USA', 'Hollywood Neighborhood, Los Angeles City, California, USA'],
        ),
        [[0, 1]],
    )
})
