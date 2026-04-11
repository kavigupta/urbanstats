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
                                termRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'James E. Rogan',
                                                wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startTerm: 2003,
                                        endTerm: 2001,
                                    },
                                ],
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
                                termRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'James E. Rogan',
                                                wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startTerm: 2003,
                                        endTerm: 2001,
                                    },
                                    {
                                        representatives: [
                                            {
                                                name: 'Gary Condit',
                                                wikipediaPage: 'https://example.com/Gary%20Condit',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startTerm: 1999,
                                        endTerm: 1993,
                                    },
                                ],
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
                                termRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'James E. Rogan',
                                                wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startTerm: 2003,
                                        endTerm: 2001,
                                    },
                                ],
                            },
                            {
                                termRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'James E. Rogan',
                                                wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startTerm: 2003,
                                        endTerm: 2001,
                                    },
                                ],
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
    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns.length, 1)
    assert.deepEqual(model.supercolumns[0].sections[0].districtHeaders, [['CA-27 (1993), USA', 'CA-06 (1993), USA']])
    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns[0].termRuns, [
        {
            representatives: [
                {
                    name: 'James E. Rogan',
                    wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                    party: 'Democratic',
                },
            ],
            startTerm: 2003,
            endTerm: 1993,
        },
    ])
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
    assert.deepEqual(model.supercolumns[0].sections[1].congressionalRuns[0].termRuns, [
        {
            representatives: [
                {
                    name: 'Gary Condit',
                    wikipediaPage: 'https://example.com/Gary%20Condit',
                    party: 'Democratic',
                },
                {
                    name: 'Carlos Moorhead',
                    wikipediaPage: 'https://example.com/Carlos%20Moorhead',
                    party: 'Democratic',
                },
            ],
            startTerm: 1999,
            endTerm: 1993,
        },
    ])
})

void test('computeCongressionalWidgetModel creates a new section when district topology changes with the same representative-count pattern', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'CA',
            representatives: [
                // A and B are parellel, C and D are parallel. this should be split up.
                representative('Representative A', 'CA-27 (1993), USA', 2003, 2005),
                representative('Representative B', 'CA-28 (2023), USA', 2003, 2005),
                representative('Representative C', 'CA-29 (2003), USA', 2001, 2003),
                representative('Representative D', 'CA-30 (2003), USA', 2001, 2003),
            ],
        },
    ])

    if (model === undefined) {
        assert.fail('Expected model to be defined')
    }

    assert.equal(model.supercolumns[0].sections.length, 2)
    assert.deepEqual(model.supercolumns[0].sections.map(section => section.startTermIndex), [0, 1])
    assert.deepEqual(model.supercolumns[0].sections.map(section => section.districtHeaders), [
        [['CA-27 (1993), USA'], ['CA-28 (2023), USA']],
        [['CA-29 (2003), USA'], ['CA-30 (2003), USA']],
    ])
    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns[0].termRuns[0], {
        representatives: [
            {
                name: 'Representative A',
                wikipediaPage: 'https://example.com/Representative%20A',
                party: 'Democratic',
            },
        ],
        startTerm: 2003,
        endTerm: 2003,
    })
    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns[1].termRuns[0], {
        representatives: [
            {
                name: 'Representative B',
                wikipediaPage: 'https://example.com/Representative%20B',
                party: 'Democratic',
            },
        ],
        startTerm: 2003,
        endTerm: 2003,
    })
})

void test('computeCongressionalWidgetModel creates per-term duplicated entries for concurrent representatives in one district', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'CA-AL',
            representatives: [
                representative('John Chilton Burch', 'CA-AL (1849), USA', 1859, 1861),
                representative('Charles L. Scott', 'CA-AL (1849), USA', 1857, 1861),
            ],
        },
    ])

    if (model === undefined) {
        assert.fail('Expected model to be defined')
    }

    assert.equal(model.supercolumns[0].sections.length, 2)
    assert.deepEqual(model.supercolumns[0].sections.map(section => [section.startTermIndex, section.endTermIndex]), [[0, 0], [1, 1]])
    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns.length, 1)
    assert.deepEqual(model.supercolumns[0].sections[1].congressionalRuns.length, 1)

    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns[0].termRuns, [
        {
            representatives: [
                {
                    name: 'John Chilton Burch',
                    wikipediaPage: 'https://example.com/John%20Chilton%20Burch',
                    party: 'Democratic',
                },
                {
                    name: 'Charles L. Scott',
                    wikipediaPage: 'https://example.com/Charles%20L.%20Scott',
                    party: 'Democratic',
                },
            ],
            startTerm: 1859,
            endTerm: 1859,
        },
    ])

    assert.deepEqual(model.supercolumns[0].sections[1].congressionalRuns[0].termRuns, [
        {
            representatives: [
                {
                    name: 'Charles L. Scott',
                    wikipediaPage: 'https://example.com/Charles%20L.%20Scott',
                    party: 'Democratic',
                },
            ],
            startTerm: 1857,
            endTerm: 1857,
        },
    ])
})
