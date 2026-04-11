import assert from 'assert/strict'
import { test } from 'node:test'

import { computeCongressionalWidgetModel } from '../src/components/congressional-table/compute-model'
import { CongressionalRepresentativeEntry } from '../src/components/congressional-table/model'

function representative(name: string, districtLongname: string, startTerm: number, endTerm?: number): CongressionalRepresentativeEntry {
    return {
        representative: {
            name,
            wikipediaPage: `https://example.com/${encodeURIComponent(name)}`,
            party: 'Democratic',
        },
        districtLongname,
        startTerm,
        endTerm,
    }
}

void test('computeCongressionalWidgetModel returns undefined for empty input', () => {
    assert.equal(computeCongressionalWidgetModel([]), undefined)
})

void test('computeCongressionalWidgetModel with only one representative', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'CA-06',
            representatives: [
                representative('James E. Rogan', 'CA-06 (1993), USA', 2001, 2005),
            ],
        },
    ])

    assert.deepEqual(model, {
        displayRows: [
            { kind: 'header-space', termIndex: 0 },
            { kind: 'term-label', termIndex: 0, termStart: 2003 },
            { kind: 'term-label', termIndex: 1, termStart: 2001 },
        ],
        supercolumns: [
            {
                longname: 'CA-06',
                sections: [
                    {
                        startTermIndex: 0,
                        endTermIndex: 1,
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 2,
                        districtHeaders: [['CA-06 (1993), USA']],
                        congressionalRuns: [
                            {
                                representatives: [
                                    {
                                        name: 'James E. Rogan',
                                        wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                        party: 'Democratic',
                                    },
                                ],
                                termCounts: [2],
                                termsByRepresentative: [[2003, 2001]],
                            },
                        ],
                    },
                ],
            },
        ],
    })
})

void test('computeCongressionalWidgetModel with multiple representatives in one district', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'CA-06',
            representatives: [
                representative('James E. Rogan', 'CA-06 (1993), USA', 2001, 2005),
                representative('Gary Condit', 'CA-06 (1993), USA', 1993, 2001),
            ],
        },
    ])
    assert.deepEqual(model, {
        displayRows: [
            { kind: 'header-space', termIndex: 0 },
            { kind: 'term-label', termIndex: 0, termStart: 2003 },
            { kind: 'term-label', termIndex: 1, termStart: 2001 },
            { kind: 'term-label', termIndex: 2, termStart: 1999 },
            { kind: 'term-label', termIndex: 3, termStart: 1997 },
            { kind: 'term-label', termIndex: 4, termStart: 1995 },
            { kind: 'term-label', termIndex: 5, termStart: 1993 },
        ],
        supercolumns: [
            {
                longname: 'CA-06',
                sections: [
                    {
                        startTermIndex: 0,
                        endTermIndex: 5,
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 6,
                        districtHeaders: [['CA-06 (1993), USA']],
                        congressionalRuns: [
                            {
                                representatives: [
                                    {
                                        name: 'James E. Rogan',
                                        wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                        party: 'Democratic',
                                    },
                                    {
                                        name: 'Gary Condit',
                                        wikipediaPage: 'https://example.com/Gary%20Condit',
                                        party: 'Democratic',
                                    },
                                ],
                                termCounts: [2, 4],
                                termsByRepresentative: [[2003, 2001], [1999, 1997, 1995, 1993]],
                            },
                        ],
                    },
                ],
            },
        ],
    })
})

void test('computeCongressionalWidgetModel keeps one section for the same representative across two districts', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'CA-06',
            representatives: [
                representative('James E. Rogan', 'CA-06 (1993), USA', 2001, 2005),
                representative('James E. Rogan', 'CA-27 (1993), USA', 2001, 2005),
            ],
        },
    ])

    assert.deepEqual(model, {
        displayRows: [
            { kind: 'header-space', termIndex: 0 },
            { kind: 'term-label', termIndex: 0, termStart: 2003 },
            { kind: 'term-label', termIndex: 1, termStart: 2001 },
        ],
        supercolumns: [
            {
                longname: 'CA-06',
                sections: [
                    {
                        startTermIndex: 0,
                        endTermIndex: 1,
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 2,
                        districtHeaders: [['CA-06 (1993), USA'], ['CA-27 (1993), USA']],
                        congressionalRuns: [
                            {
                                representatives: [
                                    {
                                        name: 'James E. Rogan',
                                        wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                        party: 'Democratic',
                                    },
                                ],
                                termCounts: [2],
                                termsByRepresentative: [[2003, 2001]],
                            },
                            {
                                representatives: [
                                    {
                                        name: 'James E. Rogan',
                                        wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                        party: 'Democratic',
                                    },
                                ],
                                termCounts: [2],
                                termsByRepresentative: [[2003, 2001]],
                            },
                        ],
                    },
                ],
            },
        ],
    })
})

void test('computeCongressionalWidgetModel keeps one section for serial district transitions by the same representative', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'CA-06',
            representatives: [
                representative('James E. Rogan', 'CA-27 (1993), USA', 2001, 2005),
                representative('James E. Rogan', 'CA-06 (1993), USA', 1993, 2001),
            ],
        },
    ])

    assert.deepEqual(model?.supercolumns[0].sections.length, 1)
    assert.deepEqual(model?.supercolumns[0].sections[0].congressionalRuns.length, 1)
    assert.deepEqual(model.supercolumns[0].sections[0].districtHeaders, [['CA-27 (1993), USA', 'CA-06 (1993), USA']])
})

void test('computeCongressionalWidgetModel creates a new section when representative multiplicity changes', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'CA-06',
            representatives: [
                representative('James E. Rogan', 'CA-06 (1993), USA', 2001, 2005),
                representative('Gary Condit', 'CA-06 (1993), USA', 1993, 2001),
                representative('Carlos Moorhead', 'CA-06 (1993), USA', 1993, 2001),
            ],
        },
    ])

    assert.deepEqual(model?.supercolumns[0].sections.length, 2)
    assert.deepEqual(model.supercolumns[0].sections.map(section => [section.startTermIndex, section.endTermIndex]), [[0, 1], [2, 5]])
    assert.deepEqual(model.supercolumns[0].sections.map(section => section.districtHeaders), [[['CA-06 (1993), USA']], [['CA-06 (1993), USA']]])
})
