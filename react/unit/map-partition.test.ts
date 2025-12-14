import assert from 'assert/strict'
import { test } from 'node:test'

import { partitionLongnames } from '../src/map-partition'
import './util/fetch'
import { bestPartition } from '../src/utils/partition'

void test('far away neighborhoods', async () => {
    assert.deepEqual(
        await partitionLongnames(
            ['Cal Young Neighborhood, Eugene City, Oregon, USA', 'Hollywood Neighborhood, Los Angeles City, California, USA'],
        ),
        [[0], [1]],
    )
})

void test('neighboring states', async () => {
    assert.deepEqual(
        await partitionLongnames(
            ['California, USA', 'Oregon, USA'],
        ),
        [[0, 1]],
    )
})

void test('3 cities', async () => {
    assert.deepEqual(
        await partitionLongnames(
            ['San Francisco city, California, USA', 'San Jose city, California, USA', 'New York city, New York, USA'],
        ),
        [[0, 1], [2]],
    )
})

void test('different order, same partitioning', async () => {
    assert.deepEqual(
        await partitionLongnames(
            ['San Francisco city, California, USA', 'New York city, New York, USA', 'San Jose city, California, USA'],
        ),
        [[0, 2], [1]],
    )
})

void test('all close together', async () => {
    // All Bay Area cities, should be grouped together
    assert.deepEqual(
        await partitionLongnames(
            ['San Francisco city, California, USA', 'Oakland city, California, USA', 'San Jose city, California, USA'],
        ),
        [[0, 1, 2]],
    )
})

void test('single place', async () => {
    assert.deepEqual(
        await partitionLongnames(
            ['San Francisco city, California, USA'],
        ),
        [[0]],
    )
})

void test('aspect ratio', async () => {
    assert.deepEqual(
        await partitionLongnames([
            'New York, USA',
            'California, USA',
            'Washington, USA',
        ]),
        [[0], [1, 2]],
    )
})

void test('some related places', async () => {
    assert.deepEqual(
        await partitionLongnames(
            ['Los Angeles city, California, USA', 'New York city, New York, USA', 'Boston city, Massachusetts, USA', 'Chicago city, Illinois, USA', 'San Francisco city, California, USA', 'San Jose city, California, USA', 'San Diego city, California, USA', 'Denver city, Colorado, USA', 'Anchorage municipality, Alaska, USA', 'Dallas city, Texas, USA', 'Austin city, Texas, USA', 'New Orleans city, Louisiana, USA', 'Santa Barbara city, California, USA'],
        ),
        [[0, 4, 5, 6, 12], [1, 2], [3], [7], [8], [9, 10, 11]],
    )
})

const manyPlaces = [
    'Shannon Colony CDP, South Dakota, USA',
    'Ruso city, North Dakota, USA',
    'Pueblo East CDP, Texas, USA',
    'Ivanof Bay CDP, Alaska, USA',
    'Hobart Bay CDP, Alaska, USA',
    'Graniteville CDP, California, USA',
    'Caribou CDP, California, USA',
    'Ardmore CDP, South Dakota, USA',
    'Willow Canyon CDP, Arizona, USA',
    'Whitestone Logging Camp CDP, Alaska, USA',
    'Toyei CDP, Arizona, USA',
    'Topock CDP, Arizona, USA',
    'Orland Colony CDP, South Dakota, USA',
    'Nabesna CDP, Alaska, USA',
    'Monowi village, Nebraska, USA',
    'Milford Colony CDP, Montana, USA',
    'Las Haciendas CDP, Texas, USA',
    'Huron Colony CDP, South Dakota, USA',
    'Hillsview town, South Dakota, USA',
    'Bijou Hills CDP, South Dakota, USA',
]

void test('handles many places', async () => {
    assert.deepEqual(
        await partitionLongnames(manyPlaces),
        [
            [0, 12, 14, 17, 18, 19],
            [1],
            [2, 16],
            [3],
            [
                4, 5, 6, 8, 9,
                10, 11, 13, 15,
            ],
            [7],
        ],
    )
})

void test('index partitions fails safe due to time limit', () => {
    assert.throws(() => {
        for (const [] of bestPartition(100, 100, () => 0, (a, b) => a - b)) { }
    }, { message: 'out of time' })
})

void test('parity example', () => {
    assert.deepEqual(
        bestPartition(3, 2, ps => ps.reduce((a, p, i) => a + p.reduce((b, n) => b + n % 2 !== i % 2 ? 1 : 0, 0), 0), (a, b) => b - a),
        [[0, 2], [1]],
    )
})
