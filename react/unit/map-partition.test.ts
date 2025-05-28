import assert from 'assert/strict'
import { test } from 'node:test'

import { partitionLongnames } from '../src/map-partition'
import './util/fetch'

void test('far away neighborhoods', async () => {
    assert.deepEqual(
        await partitionLongnames(
            ['Cal Young Neighborhood, Eugene City, Oregon, USA', 'Hollywood Neighborhood, Los Angeles City, California, USA'],
            2,
        ),
        [['Cal Young Neighborhood, Eugene City, Oregon, USA'], ['Hollywood Neighborhood, Los Angeles City, California, USA']],
    )
})

void test('neighboring states', async () => {
    assert.deepEqual(
        await partitionLongnames(
            ['California, USA', 'Oregon, USA'],
            2,
        ),
        [['California, USA', 'Oregon, USA']],
    )
})

void test('3 states', async () => {
    assert.deepEqual(
        await partitionLongnames(
            ['California, USA', 'Oregon, USA', 'New York, USA'],
            3,
        ),
        [['California, USA', 'Oregon, USA'], ['New York, USA']],
    )
})
