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

void test('3 cities', async () => {
    assert.deepEqual(
        await partitionLongnames(
            ['San Francisco city, California, USA', 'San Jose city, California, USA', 'New York city, New York, USA'],
            3,
        ),
        [['San Francisco city, California, USA', 'San Jose city, California, USA'], ['New York city, New York, USA']],
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

void test('does not run forever', async () => {
    assert.deepEqual(
        await partitionLongnames(manyPlaces, 3),
        [manyPlaces],
    )
})