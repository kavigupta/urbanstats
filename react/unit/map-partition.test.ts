import assert from 'assert/strict'
import { test } from 'node:test'

import { partitionLongnames } from '../src/map-partition'
import './util/fetch'
import './util/localStorage'
import { uniform } from '../src/navigation/random'

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
            [0], [1], [2, 16],
            [3], [4, 9], [5],
            [6], [7], [8],
            [10], [11], [12],
            [13], [14], [15],
            [17], [18], [19],
        ],
    )
})

void test('does not run forever', async () => {
    const random = await uniform()
    const randomPlaces = await Promise.all(Array.from({ length: 3000 }, random))
    assert.deepEqual(
        await partitionLongnames(randomPlaces),
        [randomPlaces.map((_, i) => i)],
    )
})
