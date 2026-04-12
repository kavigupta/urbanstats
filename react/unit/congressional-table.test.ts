import assert from 'assert/strict'
import { test } from 'node:test'

import { computeCongressionalWidgetModel } from '../src/components/congressional-table/compute-model'
import { CongressionalRepresentativeEntry, CongressionalTableModel } from '../src/components/congressional-table/model'

function assertModelDefined(model: CongressionalTableModel | undefined): asserts model is CongressionalTableModel {
    if (model === undefined) {
        assert.fail('Expected model to be defined')
    }
}

function representative(
    name: string,
    districtLongname: string,
    startTerm: number,
    endTerm?: number,
    options?: {
        wikipediaPage?: string
        party?: string
    },
): CongressionalRepresentativeEntry {
    return {
        representative: {
            name,
            wikipediaPage: options?.wikipediaPage ?? `https://example.com/${encodeURIComponent(name)}`,
            party: options?.party ?? 'Democratic',
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
            { kind: 'header-space', displayIndex: 0 },
            { kind: 'term-label', displayIndex: 1, termStart: 2005 },
            { kind: 'term-label', displayIndex: 2, termStart: 2003 },
            { kind: 'term-label', displayIndex: 3, termStart: 2001 },
        ],
        supercolumns: [
            {
                longname: 'CA-06',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 3,
                        districtHeaders: [['CA-06 (1993), USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'James E. Rogan',
                                                wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 3,
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
                representative('Gary Condit', 'CA-06 (1993), USA', 1993, 1999),
            ],
        },
    ])
    assert.deepEqual(model, {
        displayRows: [
            { kind: 'header-space', displayIndex: 0 },
            { kind: 'term-label', displayIndex: 1, termStart: 2005 },
            { kind: 'term-label', displayIndex: 2, termStart: 2003 },
            { kind: 'term-label', displayIndex: 3, termStart: 2001 },
            { kind: 'term-label', displayIndex: 4, termStart: 1999 },
            { kind: 'term-label', displayIndex: 5, termStart: 1997 },
            { kind: 'term-label', displayIndex: 6, termStart: 1995 },
            { kind: 'term-label', displayIndex: 7, termStart: 1993 },
        ],
        supercolumns: [
            {
                longname: 'CA-06',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 7,
                        districtHeaders: [['CA-06 (1993), USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'James E. Rogan',
                                                wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 3,
                                    },
                                    {
                                        representatives: [
                                            {
                                                name: 'Gary Condit',
                                                wikipediaPage: 'https://example.com/Gary%20Condit',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 4,
                                        endDisplayIndex: 7,
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
            { kind: 'header-space', displayIndex: 0 },
            { kind: 'term-label', displayIndex: 1, termStart: 2005 },
            { kind: 'term-label', displayIndex: 2, termStart: 2003 },
            { kind: 'term-label', displayIndex: 3, termStart: 2001 },
        ],
        supercolumns: [
            {
                longname: 'CA-06',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 3,
                        districtHeaders: [['CA-06 (1993), USA'], ['CA-27 (1993), USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'James E. Rogan',
                                                wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 3,
                                    },
                                ],
                            },
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'James E. Rogan',
                                                wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 3,
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
                representative('James E. Rogan', 'CA-06 (1993), USA', 1993, 1999),
            ],
        },
    ])

    assertModelDefined(model)
    assert.deepEqual(model.supercolumns[0].sections.length, 1)
    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns.length, 1)
    assert.deepEqual(model.supercolumns[0].sections[0].districtHeaders, [['CA-27 (1993), USA', 'CA-06 (1993), USA']])
    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns[0].displayRuns, [
        {
            representatives: [
                {
                    name: 'James E. Rogan',
                    wikipediaPage: 'https://example.com/James%20E.%20Rogan',
                    party: 'Democratic',
                },
            ],
            startDisplayIndex: 1,
            endDisplayIndex: 7,
        },
    ])
})

void test('computeCongressionalWidgetModel creates a new section when representative multiplicity changes', () => {
    const representativeA = {
        name: 'James E. Rogan',
        wikipediaPage: 'https://example.com/James%20E.%20Rogan',
        party: 'Democratic',
    }
    const representativeB = {
        name: 'Gary Condit',
        wikipediaPage: 'https://example.com/Gary%20Condit',
        party: 'Democratic',
    }
    const representativeC = {
        name: 'Carlos Moorhead',
        wikipediaPage: 'https://example.com/Carlos%20Moorhead',
        party: 'Democratic',
    }

    const expected = {
        displayRows: [
            { kind: 'header-space', displayIndex: 0 },
            { kind: 'term-label', displayIndex: 1, termStart: 2005 },
            { kind: 'term-label', displayIndex: 2, termStart: 2003 },
            { kind: 'term-label', displayIndex: 3, termStart: 2001 },
            { kind: 'header-space', displayIndex: 4 },
            { kind: 'term-label', displayIndex: 5, termStart: 1999 },
            { kind: 'term-label', displayIndex: 6, termStart: 1997 },
            { kind: 'term-label', displayIndex: 7, termStart: 1995 },
            { kind: 'term-label', displayIndex: 8, termStart: 1993 },
        ],
        supercolumns: [
            {
                longname: 'CA-06',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 3,
                        districtHeaders: [['CA-06 (1993), USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [representativeA],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 3,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        headerDisplayIndex: 4,
                        contentStartDisplayIndex: 5,
                        contentEndDisplayIndex: 8,
                        districtHeaders: [['CA-06 (1993), USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [representativeB, representativeC],
                                        startDisplayIndex: 5,
                                        endDisplayIndex: 8,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    }

    const model = computeCongressionalWidgetModel([
        {
            longname: 'CA-06',
            representatives: [
                representative('James E. Rogan', 'CA-06 (1993), USA', 2001, 2005),
                representative('Gary Condit', 'CA-06 (1993), USA', 1993, 1999),
                representative('Carlos Moorhead', 'CA-06 (1993), USA', 1993, 1999),
            ],
        },
    ])

    assertModelDefined(model)
    assert.deepEqual(model, expected)
})

void test('computeCongressionalWidgetModel creates a new section when district topology changes with the same representative-count pattern', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'CA',
            representatives: [
                // A and B are parellel, C and D are parallel. this should be split up.
                representative('Representative A', 'CA-27 (1993), USA', 2003, 2005),
                representative('Representative B', 'CA-28 (2023), USA', 2003, 2005),
                representative('Representative C', 'CA-29 (2003), USA', 2001, 2001),
                representative('Representative D', 'CA-30 (2003), USA', 2001, 2001),
            ],
        },
    ])

    assertModelDefined(model)

    assert.equal(model.supercolumns[0].sections.length, 2)
    assert.deepEqual(model.supercolumns[0].sections.map(section => section.contentStartDisplayIndex), [1, 4])
    assert.deepEqual(model.supercolumns[0].sections.map(section => section.districtHeaders), [
        [['CA-27 (1993), USA'], ['CA-28 (2023), USA']],
        [['CA-29 (2003), USA'], ['CA-30 (2003), USA']],
    ])
    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns[0].displayRuns[0], {
        representatives: [
            {
                name: 'Representative A',
                wikipediaPage: 'https://example.com/Representative%20A',
                party: 'Democratic',
            },
        ],
        startDisplayIndex: 1,
        endDisplayIndex: 2,
    })
    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns[1].displayRuns[0], {
        representatives: [
            {
                name: 'Representative B',
                wikipediaPage: 'https://example.com/Representative%20B',
                party: 'Democratic',
            },
        ],
        startDisplayIndex: 1,
        endDisplayIndex: 2,
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

    assertModelDefined(model)

    assert.equal(model.supercolumns[0].sections.length, 2)
    assert.deepEqual(model.supercolumns[0].sections.map(section => [section.contentStartDisplayIndex, section.contentEndDisplayIndex]), [[1, 2], [4, 4]])
    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns.length, 1)
    assert.deepEqual(model.supercolumns[0].sections[1].congressionalRuns.length, 1)

    assert.deepEqual(model.supercolumns[0].sections[0].congressionalRuns[0].displayRuns, [
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
            startDisplayIndex: 1,
            endDisplayIndex: 2,
        },
    ])

    assert.deepEqual(model.supercolumns[0].sections[1].congressionalRuns[0].displayRuns, [
        {
            representatives: [
                {
                    name: 'Charles L. Scott',
                    wikipediaPage: 'https://example.com/Charles%20L.%20Scott',
                    party: 'Democratic',
                },
            ],
            startDisplayIndex: 4,
            endDisplayIndex: 4,
        },
    ])
})

void test('computeCongressionalWidgetModel handles two geographies with one continuous and one split representative timeline', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'Geo A',
            representatives: [
                representative('Continuous Rep', 'GA-01, USA', 2013, 2021),
            ],
        },
        {
            longname: 'Geo B',
            representatives: [
                representative('Split Rep One', 'GB-01, USA', 2013, 2015),
                representative('Split Rep Two', 'GB-01, USA', 2017, 2021),
            ],
        },
    ])

    assert.deepEqual(model, {
        displayRows: [
            { kind: 'header-space', displayIndex: 0 },
            { kind: 'term-label', displayIndex: 1, termStart: 2021 },
            { kind: 'term-label', displayIndex: 2, termStart: 2019 },
            { kind: 'term-label', displayIndex: 3, termStart: 2017 },
            { kind: 'term-label', displayIndex: 4, termStart: 2015 },
            { kind: 'term-label', displayIndex: 5, termStart: 2013 },
        ],
        supercolumns: [
            {
                longname: 'Geo A',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 5,
                        districtHeaders: [['GA-01, USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Continuous Rep',
                                                wikipediaPage: 'https://example.com/Continuous%20Rep',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 5,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                longname: 'Geo B',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 5,
                        districtHeaders: [['GB-01, USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Split Rep Two',
                                                wikipediaPage: 'https://example.com/Split%20Rep%20Two',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 3,
                                    },
                                    {
                                        representatives: [
                                            {
                                                name: 'Split Rep One',
                                                wikipediaPage: 'https://example.com/Split%20Rep%20One',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 4,
                                        endDisplayIndex: 5,
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

void test('computeCongressionalWidgetModel handles two geographies with one continuous and one parallel representative timeline', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'Geo A',
            representatives: [
                representative('Continuous Rep', 'GA-01, USA', 2013, 2021),
            ],
        },
        {
            longname: 'Geo B',
            representatives: [
                representative('Parallel Rep One', 'GB-01, USA', 2013, 2021),
                representative('Parallel Rep Two', 'GB-02, USA', 2013, 2021),
            ],
        },
    ])

    assert.deepEqual(model, {
        displayRows: [
            { kind: 'header-space', displayIndex: 0 },
            { kind: 'term-label', displayIndex: 1, termStart: 2021 },
            { kind: 'term-label', displayIndex: 2, termStart: 2019 },
            { kind: 'term-label', displayIndex: 3, termStart: 2017 },
            { kind: 'term-label', displayIndex: 4, termStart: 2015 },
            { kind: 'term-label', displayIndex: 5, termStart: 2013 },
        ],
        supercolumns: [
            {
                longname: 'Geo A',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 5,
                        districtHeaders: [['GA-01, USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Continuous Rep',
                                                wikipediaPage: 'https://example.com/Continuous%20Rep',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 5,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                longname: 'Geo B',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 5,
                        districtHeaders: [['GB-01, USA'], ['GB-02, USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Parallel Rep One',
                                                wikipediaPage: 'https://example.com/Parallel%20Rep%20One',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 5,
                                    },
                                ],
                            },
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Parallel Rep Two',
                                                wikipediaPage: 'https://example.com/Parallel%20Rep%20Two',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 5,
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

void test('computeCongressionalWidgetModel handles two geographies with one continuous and one-to-two representative transition', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: 'Geo A',
            representatives: [
                representative('Continuous Rep', 'GA-01, USA', 2013, 2021),
            ],
        },
        {
            longname: 'Geo B',
            representatives: [
                representative('Solo Rep', 'GB-01, USA', 2017, 2021),
                representative('Parallel Rep One', 'GB-01, USA', 2013, 2015),
                representative('Parallel Rep Two', 'GB-02, USA', 2013, 2015),
            ],
        },
    ])

    assert.deepEqual(model, {
        displayRows: [
            { kind: 'header-space', displayIndex: 0 },
            { kind: 'term-label', displayIndex: 1, termStart: 2021 },
            { kind: 'term-label', displayIndex: 2, termStart: 2019 },
            { kind: 'term-label', displayIndex: 3, termStart: 2017 },
            { kind: 'header-space', displayIndex: 4 },
            { kind: 'term-label', displayIndex: 5, termStart: 2015 },
            { kind: 'term-label', displayIndex: 6, termStart: 2013 },
        ],
        supercolumns: [
            {
                longname: 'Geo A',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 6,
                        districtHeaders: [['GA-01, USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Continuous Rep',
                                                wikipediaPage: 'https://example.com/Continuous%20Rep',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 6,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                longname: 'Geo B',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 3,
                        districtHeaders: [['GB-01, USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Solo Rep',
                                                wikipediaPage: 'https://example.com/Solo%20Rep',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 3,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        headerDisplayIndex: 4,
                        contentStartDisplayIndex: 5,
                        contentEndDisplayIndex: 6,
                        districtHeaders: [['GB-01, USA'], ['GB-02, USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Parallel Rep One',
                                                wikipediaPage: 'https://example.com/Parallel%20Rep%20One',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 5,
                                        endDisplayIndex: 6,
                                    },
                                ],
                            },
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Parallel Rep Two',
                                                wikipediaPage: 'https://example.com/Parallel%20Rep%20Two',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 5,
                                        endDisplayIndex: 6,
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

void test('computeCongressionalWidgetModel stacks lanes in provided payload and keeps representatives merged', () => {
    const model = computeCongressionalWidgetModel([
        {
            longname: '91101, USA',
            representatives: [
                representative('Judy Chu', 'CA-28 (2023), USA', 2023, 2023),
                representative('Judy Chu', 'CA-28 (2023), USA', 2025, 2025),
                representative('Judy Chu', 'CA-27 (2013), USA', 2021, 2021),
            ],
        },
        {
            longname: '02139, USA',
            representatives: [
                representative('Katherine Clark', 'MA-05 (2023), USA', 2023, 2023),
                representative('Katherine Clark', 'MA-05 (2023), USA', 2025, 2025),
                representative('Ayanna Pressley', 'MA-07 (2023), USA', 2023, 2023),
                representative('Ayanna Pressley', 'MA-07 (2023), USA', 2025, 2025),
                representative('Katherine Clark', 'MA-05 (2013), USA', 2021, 2021),
                representative('Ayanna Pressley', 'MA-07 (2013), USA', 2021, 2021),
            ],
        },
    ])

    assert.deepEqual(model, {
        displayRows: [
            { kind: 'header-space', displayIndex: 0 },
            { kind: 'term-label', displayIndex: 1, termStart: 2025 },
            { kind: 'term-label', displayIndex: 2, termStart: 2023 },
            { kind: 'term-label', displayIndex: 3, termStart: 2021 },
        ],
        supercolumns: [
            {
                longname: '91101, USA',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 3,
                        districtHeaders: [['CA-28 (2023), USA', 'CA-27 (2013), USA']],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Judy Chu',
                                                wikipediaPage: 'https://example.com/Judy%20Chu',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 3,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                longname: '02139, USA',
                sections: [
                    {
                        headerDisplayIndex: 0,
                        contentStartDisplayIndex: 1,
                        contentEndDisplayIndex: 3,
                        districtHeaders: [
                            ['MA-07 (2023), USA', 'MA-07 (2013), USA'],
                            ['MA-05 (2023), USA', 'MA-05 (2013), USA'],
                        ],
                        congressionalRuns: [
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Ayanna Pressley',
                                                wikipediaPage: 'https://example.com/Ayanna%20Pressley',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 3,
                                    },
                                ],
                            },
                            {
                                displayRuns: [
                                    {
                                        representatives: [
                                            {
                                                name: 'Katherine Clark',
                                                wikipediaPage: 'https://example.com/Katherine%20Clark',
                                                party: 'Democratic',
                                            },
                                        ],
                                        startDisplayIndex: 1,
                                        endDisplayIndex: 3,
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
