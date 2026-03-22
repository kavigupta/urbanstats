import assert from 'assert/strict'
import { test } from 'node:test'

import './util/fetch'
import { loadArticleFromConsolidatedShard } from '../src/load_json'
import { dataLink } from '../src/navigation/links'

/**
 * Load an article and return the flattened relationships
 * Only returns outgoing relationships (where the article is the source)
 * @param longname The longname of the article to load
 * @param filterType Only return relationships where the other geography has this row_type
 * @returns A set of tuples (otherLongname, relationshipType)
 */
async function getRelationships(longname: string, filterType: string): Promise<Set<[string, string]>> {
    const shardUrl = await dataLink(longname)
    const article = await loadArticleFromConsolidatedShard(shardUrl, longname)

    if (!article?.related) {
        return new Set()
    }

    const relationships = new Set<[string, string]>()

    for (const relatedGroup of article.related) {
        if (!relatedGroup.buttons || !relatedGroup.relationshipType) {
            continue
        }
        for (const button of relatedGroup.buttons) {
            if (button.longname && button.rowType === filterType) {
                relationships.add([button.longname, relatedGroup.relationshipType])
            }
        }
    }

    return relationships
}

void test('neighbors-california', async () => {
    const californiaRelationships = await getRelationships('California, USA', 'Subnational Region')

    const expectedRelationships = new Set<[string, string]>([
        ['Arizona, USA', 'borders'],
        ['Baja California, Mexico', 'borders'],
        ['Nevada, USA', 'borders'],
        ['Oregon, USA', 'borders'],
    ])

    assert.deepStrictEqual(californiaRelationships, expectedRelationships)
})

void test('neighbors-michigan', async () => {
    const michiganRelationships = await getRelationships('Michigan, USA', 'Subnational Region')

    const expectedRelationships = new Set<[string, string]>([
        ['Indiana, USA', 'borders'],
        ['Wisconsin, USA', 'borders'],
        ['Ohio, USA', 'borders'],
        ['Ontario, Canada', 'borders'],
    ])

    assert.deepStrictEqual(michiganRelationships, expectedRelationships)
})

void test('continents-for-turkey', async () => {
    const turkeyRelationships = await getRelationships('Turkey', 'Continent')

    const expectedRelationships = new Set<[string, string]>([
        ['Asia', 'intersects'],
        ['Europe', 'intersects'],
    ])

    assert.deepStrictEqual(turkeyRelationships, expectedRelationships)
})

void test('continents-for-guatemala', async () => {
    const guatemalaRelationships = await getRelationships('Guatemala', 'Continent')

    const expectedRelationships = new Set<[string, string]>([
        ['North America', 'contained_by'],
    ])

    assert.deepStrictEqual(guatemalaRelationships, expectedRelationships)
})

void test('cities-los-angeles-urban-area', async () => {
    const laRelationships = await getRelationships('Los Angeles-Long Beach-Anaheim [Urban Area], CA, USA', 'County')

    const expectedRelationships = new Set<[string, string]>([
        ['Orange County, California, USA', 'intersects'],
        ['San Bernardino County, California, USA', 'intersects'],
        ['Los Angeles County, California, USA', 'intersects'],
        ['Ventura County, California, USA', 'borders'],
        ['Riverside County, California, USA', 'borders'],
    ])

    assert.deepStrictEqual(laRelationships, expectedRelationships)
})

void test('san-marino-city-relationships', async () => {
    const sanMarinoRelationships = await getRelationships('San Marino city, California, USA', 'City')

    const expectedRelationships = new Set<[string, string]>([
        ['Pasadena city, California, USA', 'borders'],
        ['San Pasqual CDP, California, USA', 'borders'],
        ['East Pasadena CDP, California, USA', 'borders'],
        ['East San Gabriel CDP, California, USA', 'borders'],
        ['San Gabriel city, California, USA', 'borders'],
        ['Alhambra city, California, USA', 'borders'],
        ['South Pasadena city, California, USA', 'borders'],
    ])

    assert.deepStrictEqual(sanMarinoRelationships, expectedRelationships)
})

void test('los-alamos-msa-same-geography', async () => {
    const msaRelationships = await getRelationships('Los Alamos MSA, NM, USA', 'County')

    const expectedRelationships = new Set<[string, string]>([
        ['Los Alamos County, New Mexico, USA', 'same_geography'],
        ['Santa Fe County, New Mexico, USA', 'borders'],
        ['Rio Arriba County, New Mexico, USA', 'borders'],
        ['Sandoval County, New Mexico, USA', 'borders'],
    ])

    assert.deepStrictEqual(msaRelationships, expectedRelationships)
})

void test('boothbay-harbor-contained-by-county', async () => {
    const boothbayRelationships = await getRelationships('Boothbay Harbor [Urban Area], ME, USA', 'County')

    const expectedRelationships = new Set<[string, string]>([
        ['Lincoln County, Maine, USA', 'contained_by'],
    ])

    assert.deepStrictEqual(boothbayRelationships, expectedRelationships)
})

void test('contents-borders-delaware', async () => {
    const delawareRelationships = await getRelationships('Delaware, USA', 'County')

    const expectedRelationships = new Set<[string, string]>([
        ['Sussex County, Delaware, USA', 'contains'],
        ['New Castle County, Delaware, USA', 'contains'],
        ['Kent County, Delaware, USA', 'contains'],
        // we don't report borders for one level down in the actual website.
        // ['Worcester County, Maryland, USA', 'borders'],
        // ['Wicomico County, Maryland, USA', 'borders'],
        // ['Dorchester County, Maryland, USA', 'borders'],
        // ['Caroline County, Maryland, USA', 'borders'],
        // ['Queen Anne\'s County, Maryland, USA', 'borders'],
        // ['Cecil County, Maryland, USA', 'borders'],
        // ['Kent County, Maryland, USA', 'borders'],
        // ['Chester County, Pennsylvania, USA', 'borders'],
        // ['Delaware County, Pennsylvania, USA', 'borders'],
        // ['Gloucester County, New Jersey, USA', 'borders'],
        // ['Salem County, New Jersey, USA', 'borders'],
    ])

    assert.deepStrictEqual(delawareRelationships, expectedRelationships)
})

void test('issue-1289-stbernard', async () => {
    const stBernardRelationships = await getRelationships('District E [CCD], St. Bernard Parish, Louisiana, USA', 'County')

    const expectedRelationships = new Set<[string, string]>([
        ['St. Bernard Parish, Louisiana, USA', 'contained_by'],
        // we don't report borders for one level up in the actual website.
        // ['Orleans Parish, Louisiana, USA', 'borders'],
        // ['Plaquemines Parish, Louisiana, USA', 'borders'],
    ])

    assert.deepStrictEqual(stBernardRelationships, expectedRelationships)
})

void test('issue-247-acapulco-5mpc-vs-tokyo-1bpc', async () => {
    const acapulcoRelationships = await getRelationships('Acapulco 5MPC, Mexico', '1B Person Circle')

    const expectedRelationships = new Set<[string, string]>([
        ['São Paulo 1BPC, USA-Brazil-Mexico', 'contained_by'],
    ])

    assert.deepStrictEqual(acapulcoRelationships, expectedRelationships)
})

void test('6th-judicial-circuit-relationships', async () => {
    const circuitRelationships = await getRelationships('6th Circuit, USA', 'Subnational Region')

    const expectedRelationships = new Set<[string, string]>([
        ['Michigan, USA', 'contains'],
        ['Ohio, USA', 'contains'],
        ['Kentucky, USA', 'contains'],
        ['Tennessee, USA', 'contains'],
        ['Ontario, Canada', 'borders'],
        ['Pennsylvania, USA', 'borders'],
        ['West Virginia, USA', 'borders'],
        ['Virginia, USA', 'borders'],
        ['North Carolina, USA', 'borders'],
        ['Georgia, USA', 'borders'],
        ['Alabama, USA', 'borders'],
        ['Mississippi, USA', 'borders'],
        ['Arkansas, USA', 'borders'],
        ['Missouri, USA', 'borders'],
        ['Illinois, USA', 'borders'],
        ['Indiana, USA', 'borders'],
        ['Wisconsin, USA', 'borders'],
        ['Minnesota, USA', 'borders'],
    ])

    assert.deepStrictEqual(circuitRelationships, expectedRelationships)
})

void test('9th-judicial-circuit-relationships', async () => {
    const circuitRelationships = await getRelationships('9th Circuit, USA', 'Subnational Region')

    const expectedRelationships = new Set<[string, string]>([
        ['Alaska, USA', 'contains'],
        ['Washington, USA', 'contains'],
        ['Oregon, USA', 'contains'],
        ['Idaho, USA', 'contains'],
        ['Montana, USA', 'contains'],
        ['California, USA', 'contains'],
        ['Nevada, USA', 'contains'],
        ['Arizona, USA', 'contains'],
        ['Hawaii, USA', 'contains'],
        ['Guam, USA', 'contains'],
        ['Yukon, Canada', 'borders'],
        ['British Columbia, Canada', 'borders'],
        ['Alberta, Canada', 'borders'],
        ['Saskatchewan, Canada', 'borders'],
        ['North Dakota, USA', 'borders'],
        ['South Dakota, USA', 'borders'],
        ['Wyoming, USA', 'borders'],
        ['Utah, USA', 'borders'],
        ['New Mexico, USA', 'borders'],
        ['Sonora, Mexico', 'borders'],
        ['Baja California, Mexico', 'borders'],
        ['Colorado, USA', 'borders'],
        ['Chihuahua, Mexico', 'borders'],
        ['Chukotskiy avtonomnyy okrug, Russia', 'borders'],
        ['Northern Mariana Islands, USA', 'borders'],
    ])

    assert.deepStrictEqual(circuitRelationships, expectedRelationships)
})

void test('10th-judicial-circuit-relationships', async () => {
    const circuitRelationships = await getRelationships('10th Circuit, USA', 'Subnational Region')

    const expectedRelationships = new Set<[string, string]>([
        [
            'Wyoming, USA',
            'contains',
        ],
        [
            'Utah, USA',
            'contains',
        ],
        [
            'Colorado, USA',
            'contains',
        ],
        [
            'Kansas, USA',
            'contains',
        ],
        [
            'New Mexico, USA',
            'contains',
        ],
        [
            'Oklahoma, USA',
            'contains',
        ],
        [
            'Montana, USA',
            'borders',
        ],
        [
            'South Dakota, USA',
            'borders',
        ],
        [
            'Nebraska, USA',
            'borders',
        ],
        [
            'Missouri, USA',
            'borders',
        ],
        [
            'Arkansas, USA',
            'borders',
        ],
        [
            'Texas, USA',
            'borders',
        ],
        [
            'Chihuahua, Mexico',
            'borders',
        ],
        [
            'Sonora, Mexico',
            'borders',
        ],
        [
            'Arizona, USA',
            'borders',
        ],
        [
            'Nevada, USA',
            'borders',
        ],
        [
            'Idaho, USA',
            'borders',
        ],
    ],
    )

    assert.deepStrictEqual(circuitRelationships, expectedRelationships)
})

void test('ca-sd23-relationship-to-congressional-districts', async () => {
    const districtRelationships = await getRelationships('CA-SD23 (2023), USA', 'Congressional District')

    const expectedRelationships = new Set<[string, string]>([
        ['CA-20 (2023), USA', 'borders'],
        ['CA-23 (2023), USA', 'intersects'],
        ['CA-26 (2023), USA', 'borders'],
        ['CA-27 (2023), USA', 'intersects'],
        ['CA-28 (2023), USA', 'intersects'],
        ['CA-29 (2023), USA', 'borders'],
        ['CA-30 (2023), USA', 'intersects'],
        ['CA-32 (2023), USA', 'borders'],
    ])

    assert.deepStrictEqual(districtRelationships, expectedRelationships)
})
