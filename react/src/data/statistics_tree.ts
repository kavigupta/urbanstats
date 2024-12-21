export const dataSources = [
    {
        category: 'Population',
        sources: [
            {
                source: 'US Census',
                is_default: true,
            },
            {
                source: 'Canadian Census',
                is_default: true,
            },
            {
                source: 'GHSL',
                is_default: false,
            },
        ],
    },
] as const

export const rawStatsTree = [
    {
        id: 'main',
        name: 'Main',
        contents: [
            {
                id: 'population',
                name: 'Population',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Population',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 244,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 247,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'GHSL',
                                        },
                                        column: 104,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Population (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 246,
                                    },
                                ],
                            },
                            {
                                name: 'Population Change (2010-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 249,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Population (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 245,
                                    },
                                ],
                            },
                            {
                                name: 'Population Change (2000-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 248,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'ad_1',
                name: 'PW Density (r=1km)',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=1km)',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 39,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 76,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'GHSL',
                                        },
                                        column: 105,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=1km) (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 41,
                                    },
                                ],
                            },
                            {
                                name: 'PW Density (r=1km) Change (2010-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 43,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=1km) (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 40,
                                    },
                                ],
                            },
                            {
                                name: 'PW Density (r=1km) Change (2000-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 42,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'sd',
                name: 'AW Density',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'AW Density',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 262,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 265,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'GHSL',
                                        },
                                        column: 103,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'AW Density (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 264,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'AW Density (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 263,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'area',
                name: 'Area',
                contents: [
                    {
                        year: null,
                        stats_by_source: [
                            {
                                name: 'Area',
                                stats: [
                                    {
                                        source: null,
                                        column: 54,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'compactness',
                name: 'Compactness',
                contents: [
                    {
                        year: null,
                        stats_by_source: [
                            {
                                name: 'Compactness',
                                stats: [
                                    {
                                        source: null,
                                        column: 67,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'topography',
        name: 'Topography',
        contents: [
            {
                id: 'gridded_hilliness',
                name: 'PW Mean Hilliness (Grade)',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Mean Hilliness (Grade)',
                                stats: [
                                    {
                                        source: null,
                                        column: 109,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'gridded_elevation',
                name: 'PW Mean Elevation',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Mean Elevation',
                                stats: [
                                    {
                                        source: null,
                                        column: 108,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'race',
        name: 'Race',
        contents: [
            {
                id: 'white',
                name: 'White %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'White %',
                                stats: [
                                    {
                                        source: null,
                                        column: 305,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'White % (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 307,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'White % (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 306,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'hispanic',
                name: 'Hispanic %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Hispanic %',
                                stats: [
                                    {
                                        source: null,
                                        column: 119,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Hispanic % (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 121,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Hispanic % (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 120,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'black',
                name: 'Black %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Black %',
                                stats: [
                                    {
                                        source: null,
                                        column: 61,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Black % (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 63,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Black % (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 62,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'asian',
                name: 'Asian %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Asian %',
                                stats: [
                                    {
                                        source: null,
                                        column: 55,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Asian % (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 57,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Asian % (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 56,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'native',
                name: 'Native %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Native %',
                                stats: [
                                    {
                                        source: null,
                                        column: 212,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Native % (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 214,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Native % (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 213,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'hawaiian_pi',
                name: 'Hawaiian / PI %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Hawaiian / PI %',
                                stats: [
                                    {
                                        source: null,
                                        column: 110,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Hawaiian / PI % (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 112,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Hawaiian / PI % (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 111,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'other  slash  mixed',
                name: 'Other / Mixed %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Other / Mixed %',
                                stats: [
                                    {
                                        source: null,
                                        column: 240,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Other / Mixed % (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 242,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Other / Mixed % (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 241,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'homogeneity_250',
                name: 'Racial Homogeneity %',
                contents: [
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Racial Homogeneity (2000) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 122,
                                    },
                                ],
                            },
                            {
                                name: 'Racial Homogeneity Change (2000-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 125,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Racial Homogeneity (2010) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 123,
                                    },
                                ],
                            },
                            {
                                name: 'Racial Homogeneity Change (2010-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 126,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Racial Homogeneity %',
                                stats: [
                                    {
                                        source: null,
                                        column: 124,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'segregation_250',
                name: 'Segregation %',
                contents: [
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Segregation (2000) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 271,
                                    },
                                ],
                            },
                            {
                                name: 'Segregation Change (2000-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 274,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Segregation (2010) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 272,
                                    },
                                ],
                            },
                            {
                                name: 'Segregation Change (2010-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 275,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Segregation %',
                                stats: [
                                    {
                                        source: null,
                                        column: 273,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'segregation_250_10',
                name: 'Mean Local Segregation %',
                contents: [
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Mean Local Segregation (2000) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 266,
                                    },
                                ],
                            },
                            {
                                name: 'Mean Local Segregation Change (2000-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 269,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Mean Local Segregation (2010) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 267,
                                    },
                                ],
                            },
                            {
                                name: 'Mean Local Segregation Change (2010-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 270,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean Local Segregation %',
                                stats: [
                                    {
                                        source: null,
                                        column: 268,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'national_origin',
        name: 'National Origin',
        contents: [
            {
                id: 'citizenship_citizen_by_birth',
                name: 'Citizen by Birth %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Citizen by Birth %',
                                stats: [
                                    {
                                        source: null,
                                        column: 64,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'citizenship_citizen_by_naturalization',
                name: 'Citizen by Naturalization %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Citizen by Naturalization %',
                                stats: [
                                    {
                                        source: null,
                                        column: 65,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'citizenship_not_citizen',
                name: 'Non-citizen %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Non-citizen %',
                                stats: [
                                    {
                                        source: null,
                                        column: 66,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'birthplace_non_us',
                name: 'Born outside US %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Born outside US %',
                                stats: [
                                    {
                                        source: null,
                                        column: 58,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'birthplace_us_not_state',
                name: 'Born in us outside state %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Born in us outside state %',
                                stats: [
                                    {
                                        source: null,
                                        column: 59,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'birthplace_us_state',
                name: 'Born in state of residence %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Born in state of residence %',
                                stats: [
                                    {
                                        source: null,
                                        column: 60,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'language_english_only',
                name: 'Only English at Home %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Only English at Home %',
                                stats: [
                                    {
                                        source: null,
                                        column: 187,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'language_spanish',
                name: 'Spanish at Home %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Spanish at Home %',
                                stats: [
                                    {
                                        source: null,
                                        column: 189,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'language_other',
                name: 'Other at Home %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Other at Home %',
                                stats: [
                                    {
                                        source: null,
                                        column: 188,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'education',
        name: 'Education',
        contents: [
            {
                id: 'education_high_school',
                name: 'High School %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'High School %',
                                stats: [
                                    {
                                        source: null,
                                        column: 84,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'education_ugrad',
                name: 'Undergrad %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Undergrad %',
                                stats: [
                                    {
                                        source: null,
                                        column: 86,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'education_grad',
                name: 'Grad %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Grad %',
                                stats: [
                                    {
                                        source: null,
                                        column: 82,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'education_high_school_canada',
                name: 'High school diploma [25-64] %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'High school diploma [25-64] %',
                                stats: [
                                    {
                                        source: null,
                                        column: 85,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'education_ugrad_canada',
                name: 'Bachelor\'s degree [25-64] %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Bachelor\'s degree [25-64] %',
                                stats: [
                                    {
                                        source: null,
                                        column: 87,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'education_grad_canada',
                name: 'Graduate degree [25-64] %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Graduate degree [25-64] %',
                                stats: [
                                    {
                                        source: null,
                                        column: 83,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'education_field_stem',
                name: 'Undergrad STEM %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Undergrad STEM %',
                                stats: [
                                    {
                                        source: null,
                                        column: 81,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'education_field_humanities',
                name: 'Undergrad Humanities %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Undergrad Humanities %',
                                stats: [
                                    {
                                        source: null,
                                        column: 80,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'education_field_business',
                name: 'Undergrad Business %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Undergrad Business %',
                                stats: [
                                    {
                                        source: null,
                                        column: 79,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'female_hs_gap_4',
                name: '% of women with high school education - % of men with high school education',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '% of women with high school education - % of men with high school education',
                                stats: [
                                    {
                                        source: null,
                                        column: 89,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'female_ugrad_gap_4',
                name: '% of women with undergraduate education - % of men with undergraduate education',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '% of women with undergraduate education - % of men with undergraduate education',
                                stats: [
                                    {
                                        source: null,
                                        column: 90,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'female_grad_gap_4',
                name: '% of women with graduate education - % of men with graduate education',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '% of women with graduate education - % of men with graduate education',
                                stats: [
                                    {
                                        source: null,
                                        column: 88,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'generation',
        name: 'Generation',
        contents: [
            {
                id: 'generation_silent',
                name: 'Silent %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Silent %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 101,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 102,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'generation_boomer',
                name: 'Boomer %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Boomer %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 91,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 92,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'generation_genx',
                name: 'Gen X %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Gen X %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 95,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 96,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'generation_millenial',
                name: 'Millennial %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Millennial %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 99,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 100,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'generation_genz',
                name: 'Gen Z %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Gen Z %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 97,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 98,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'generation_genalpha',
                name: 'Gen Alpha %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Gen Alpha %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 93,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 94,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'income',
        name: 'Income',
        contents: [
            {
                id: 'poverty_below_line',
                name: 'Poverty %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Poverty %',
                                stats: [
                                    {
                                        source: null,
                                        column: 250,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'lico_at_canada',
                name: 'LICO-AT %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'LICO-AT %',
                                stats: [
                                    {
                                        source: null,
                                        column: 194,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'household_income_under_50k',
                name: 'Household Income < $50k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Household Income < $50k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 133,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'household_income_50k_to_100k',
                name: 'Household Income $50k - $100k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Household Income $50k - $100k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 129,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'household_income_over_100k',
                name: 'Household Income > $100k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Household Income > $100k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 131,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'household_income_under_50cad',
                name: 'Household income < C$50k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Household income < C$50k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 132,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'household_income_50_to_100cad',
                name: 'Household income C$50k - C$100k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Household income C$50k - C$100k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 128,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'household_income_above_100_cad',
                name: 'Household income > C$100k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Household income > C$100k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 130,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'individual_income_under_50k',
                name: 'Individual Income < $50k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Individual Income < $50k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 142,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'individual_income_50k_to_100k',
                name: 'Individual Income $50k - $100k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Individual Income $50k - $100k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 138,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'individual_income_over_100k',
                name: 'Individual Income > $100k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Individual Income > $100k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 140,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'individual_income_under_50cad',
                name: 'Individual income < C$50k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Individual income < C$50k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 141,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'individual_income_50_to_100cad',
                name: 'Individual income C$50k - C$100k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Individual income C$50k - C$100k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 137,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'individual_income_above_100_cad',
                name: 'Individual income > C$100k %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Individual income > C$100k %',
                                stats: [
                                    {
                                        source: null,
                                        column: 139,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'housing',
        name: 'Housing',
        contents: [
            {
                id: 'housing_per_pop',
                name: 'Housing Units per Adult',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Housing Units per Adult',
                                stats: [
                                    {
                                        source: null,
                                        column: 134,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Housing Units per Adult (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 136,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Housing Units per Adult (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 135,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'vacancy',
                name: 'Vacancy %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Vacancy %',
                                stats: [
                                    {
                                        source: null,
                                        column: 299,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'Vacancy % (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 301,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'Vacancy % (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 300,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rent_burden_under_20',
                name: 'Rent/Income < 20%',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Rent/Income < 20%',
                                stats: [
                                    {
                                        source: null,
                                        column: 260,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rent_burden_20_to_40',
                name: 'Rent/Income 20%-40%',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Rent/Income 20%-40%',
                                stats: [
                                    {
                                        source: null,
                                        column: 258,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rent_burden_over_40',
                name: 'Rent/Income > 40%',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Rent/Income > 40%',
                                stats: [
                                    {
                                        source: null,
                                        column: 259,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rent_1br_under_750',
                name: '1BR Rent < $750 %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '1BR Rent < $750 %',
                                stats: [
                                    {
                                        source: null,
                                        column: 254,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rent_1br_750_to_1500',
                name: '1BR Rent $750 - $1500 %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '1BR Rent $750 - $1500 %',
                                stats: [
                                    {
                                        source: null,
                                        column: 252,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rent_1br_over_1500',
                name: '1BR Rent > $1500 %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '1BR Rent > $1500 %',
                                stats: [
                                    {
                                        source: null,
                                        column: 253,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rent_2br_under_750',
                name: '2BR Rent < $750 %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '2BR Rent < $750 %',
                                stats: [
                                    {
                                        source: null,
                                        column: 257,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rent_2br_750_to_1500',
                name: '2BR Rent $750 - $1500 %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '2BR Rent $750 - $1500 %',
                                stats: [
                                    {
                                        source: null,
                                        column: 255,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rent_2br_over_1500',
                name: '2BR Rent > $1500 %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '2BR Rent > $1500 %',
                                stats: [
                                    {
                                        source: null,
                                        column: 256,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'year_built_1969_or_earlier',
                name: '% units built pre-1970',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '% units built pre-1970',
                                stats: [
                                    {
                                        source: null,
                                        column: 313,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'year_built_1970_to_1979',
                name: '% units built in 1970s',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '% units built in 1970s',
                                stats: [
                                    {
                                        source: null,
                                        column: 314,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'year_built_1980_to_1989',
                name: '% units built in 1980s',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '% units built in 1980s',
                                stats: [
                                    {
                                        source: null,
                                        column: 315,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'year_built_1990_to_1999',
                name: '% units built in 1990s',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '% units built in 1990s',
                                stats: [
                                    {
                                        source: null,
                                        column: 316,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'year_built_2000_to_2009',
                name: '% units built in 2000s',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '% units built in 2000s',
                                stats: [
                                    {
                                        source: null,
                                        column: 317,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'year_built_2010_or_later',
                name: '% units built in 2010s+',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '% units built in 2010s+',
                                stats: [
                                    {
                                        source: null,
                                        column: 318,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rent_or_own_rent',
                name: 'Renter %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Renter %',
                                stats: [
                                    {
                                        source: null,
                                        column: 261,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'transportation',
        name: 'Transportation',
        contents: [
            {
                id: 'transportation_means_car',
                name: 'Commute Car %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Commute Car %',
                                stats: [
                                    {
                                        source: null,
                                        column: 295,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'transportation_means_bike',
                name: 'Commute Bike %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Commute Bike %',
                                stats: [
                                    {
                                        source: null,
                                        column: 294,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'transportation_means_walk',
                name: 'Commute Walk %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Commute Walk %',
                                stats: [
                                    {
                                        source: null,
                                        column: 297,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'transportation_means_transit',
                name: 'Commute Transit %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Commute Transit %',
                                stats: [
                                    {
                                        source: null,
                                        column: 296,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'transportation_means_worked_at_home',
                name: 'Commute Work From Home %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Commute Work From Home %',
                                stats: [
                                    {
                                        source: null,
                                        column: 298,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'transportation_commute_time_under_15',
                name: 'Commute Time < 15 min %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Commute Time < 15 min %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 292,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 293,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'transportation_commute_time_15_to_29',
                name: 'Commute Time 15 - 29 min %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Commute Time 15 - 29 min %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 286,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 287,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'transportation_commute_time_30_to_59',
                name: 'Commute Time 30 - 59 min %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Commute Time 30 - 59 min %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 288,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 289,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'transportation_commute_time_over_60',
                name: 'Commute Time > 60 min %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Commute Time > 60 min %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 290,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 291,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'vehicle_ownership_none',
                name: 'Households With no Vehicle %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Households With no Vehicle %',
                                stats: [
                                    {
                                        source: null,
                                        column: 304,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'vehicle_ownership_at_least_1',
                name: 'Households With 1+ Vehicles %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Households With 1+ Vehicles %',
                                stats: [
                                    {
                                        source: null,
                                        column: 302,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'vehicle_ownership_at_least_2',
                name: 'Households With 2+ Vehicles %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Households With 2+ Vehicles %',
                                stats: [
                                    {
                                        source: null,
                                        column: 303,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'traffic_fatalities_last_decade_per_capita',
                name: 'Traffic Fatalities Per Capita Per Year',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Traffic Fatalities Per Capita Per Year',
                                stats: [
                                    {
                                        source: null,
                                        column: 283,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'traffic_fatalities_ped_last_decade_per_capita',
                name: 'Pedestrian/Cyclist Fatalities Per Capita Per Year',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Pedestrian/Cyclist Fatalities Per Capita Per Year',
                                stats: [
                                    {
                                        source: null,
                                        column: 285,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'traffic_fatalities_last_decade',
                name: 'Total Traffic Fatalities In Last Decade',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Total Traffic Fatalities In Last Decade',
                                stats: [
                                    {
                                        source: null,
                                        column: 282,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'traffic_fatalities_ped_last_decade',
                name: 'Total Pedestrian/Cyclist Fatalities In Last Decade',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Total Pedestrian/Cyclist Fatalities In Last Decade',
                                stats: [
                                    {
                                        source: null,
                                        column: 284,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'health',
        name: 'Health',
        contents: [
            {
                id: 'GHLTH_cdc_2',
                name: 'Fair or poor self-rated health status %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Fair or poor self-rated health status %',
                                stats: [
                                    {
                                        source: null,
                                        column: 17,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'PHLTH_cdc_2',
                name: 'Physical health not good for two weeks in last year %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Physical health not good for two weeks in last year %',
                                stats: [
                                    {
                                        source: null,
                                        column: 24,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'ARTHRITIS_cdc_2',
                name: 'Arthritis %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Arthritis %',
                                stats: [
                                    {
                                        source: null,
                                        column: 3,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'CASTHMA_cdc_2',
                name: 'Current asthma %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Current asthma %',
                                stats: [
                                    {
                                        source: null,
                                        column: 7,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'BPHIGH_cdc_2',
                name: 'High blood pressure %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'High blood pressure %',
                                stats: [
                                    {
                                        source: null,
                                        column: 5,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'CANCER_cdc_2',
                name: 'Cancer (excluding skin cancer) %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Cancer (excluding skin cancer) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 6,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'KIDNEY_cdc_2',
                name: 'Chronic kidney disease %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Chronic kidney disease %',
                                stats: [
                                    {
                                        source: null,
                                        column: 20,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'COPD_cdc_2',
                name: 'COPD %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'COPD %',
                                stats: [
                                    {
                                        source: null,
                                        column: 12,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'CHD_cdc_2',
                name: 'Coronary heart disease %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Coronary heart disease %',
                                stats: [
                                    {
                                        source: null,
                                        column: 8,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'DIABETES_cdc_2',
                name: 'Diagnosed diabetes %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Diagnosed diabetes %',
                                stats: [
                                    {
                                        source: null,
                                        column: 15,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'OBESITY_cdc_2',
                name: 'Obesity %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Obesity %',
                                stats: [
                                    {
                                        source: null,
                                        column: 23,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'STROKE_cdc_2',
                name: 'Stroke %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Stroke %',
                                stats: [
                                    {
                                        source: null,
                                        column: 27,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'DISABILITY_cdc_2',
                name: 'Disability %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Disability %',
                                stats: [
                                    {
                                        source: null,
                                        column: 16,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'HEARING_cdc_2',
                name: 'Hearing disability %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Hearing disability %',
                                stats: [
                                    {
                                        source: null,
                                        column: 18,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'VISION_cdc_2',
                name: 'Vision disability %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Vision disability %',
                                stats: [
                                    {
                                        source: null,
                                        column: 28,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'COGNITION_cdc_2',
                name: 'Cognitive disability %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Cognitive disability %',
                                stats: [
                                    {
                                        source: null,
                                        column: 11,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'MOBILITY_cdc_2',
                name: 'Mobility disability %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mobility disability %',
                                stats: [
                                    {
                                        source: null,
                                        column: 22,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'SELFCARE_cdc_2',
                name: 'Self-care disability %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Self-care disability %',
                                stats: [
                                    {
                                        source: null,
                                        column: 25,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'INDEPLIVE_cdc_2',
                name: 'Independent living disability %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Independent living disability %',
                                stats: [
                                    {
                                        source: null,
                                        column: 19,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'BINGE_cdc_2',
                name: 'Binge drinking among adults %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Binge drinking among adults %',
                                stats: [
                                    {
                                        source: null,
                                        column: 4,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'CSMOKING_cdc_2',
                name: 'Smoking %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Smoking %',
                                stats: [
                                    {
                                        source: null,
                                        column: 13,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'LPA_cdc_2',
                name: 'No leisure-time physical activity %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'No leisure-time physical activity %',
                                stats: [
                                    {
                                        source: null,
                                        column: 21,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'SLEEP_cdc_2',
                name: 'Sleeping less than 7 hours %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Sleeping less than 7 hours %',
                                stats: [
                                    {
                                        source: null,
                                        column: 26,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'CHECKUP_cdc_2',
                name: 'Attended doctor in last year %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Attended doctor in last year %',
                                stats: [
                                    {
                                        source: null,
                                        column: 9,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'DENTAL_cdc_2',
                name: 'Attended dentist in last year %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Attended dentist in last year %',
                                stats: [
                                    {
                                        source: null,
                                        column: 14,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'CHOLSCREEN_cdc_2',
                name: 'Cholesterol screening in last year %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Cholesterol screening in last year %',
                                stats: [
                                    {
                                        source: null,
                                        column: 10,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'climate_change',
        name: 'Climate Change',
        contents: [
            {
                id: 'heating_utility_gas',
                name: 'Utility gas heating %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Utility gas heating %',
                                stats: [
                                    {
                                        source: null,
                                        column: 118,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'heating_electricity',
                name: 'Electricity heating %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Electricity heating %',
                                stats: [
                                    {
                                        source: null,
                                        column: 114,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'heating_bottled_tank_lp_gas',
                name: 'Bottled, tank, or LP gas heating %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Bottled, tank, or LP gas heating %',
                                stats: [
                                    {
                                        source: null,
                                        column: 113,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'heating_feul_oil_kerosene',
                name: 'Fuel oil, kerosene, etc. heating %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Fuel oil, kerosene, etc. heating %',
                                stats: [
                                    {
                                        source: null,
                                        column: 115,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'heating_other',
                name: 'Other fuel heating %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Other fuel heating %',
                                stats: [
                                    {
                                        source: null,
                                        column: 117,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'heating_no',
                name: 'No heating %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'No heating %',
                                stats: [
                                    {
                                        source: null,
                                        column: 116,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'industry',
        name: 'Industry',
        contents: [
            {
                id: 'industry_agriculture,_forestry,_fishing_and_hunting',
                name: 'Agriculture, forestry, fishing and hunting %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Agriculture, forestry, fishing and hunting %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 147,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 148,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_mining,_quarrying,_and_oil_and_gas_extraction',
                name: 'Mining, quarrying, and oil and gas extraction %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mining, quarrying, and oil and gas extraction %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 165,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 166,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_accommodation_and_food_services',
                name: 'Accommodation and food services %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Accommodation and food services %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 143,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 144,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_arts,_entertainment,_and_recreation',
                name: 'Arts, entertainment, and recreation %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Arts, entertainment, and recreation %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 149,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 150,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_construction',
                name: 'Construction %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Construction %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 151,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 152,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_educational_services',
                name: 'Educational services %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Educational services %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 153,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 154,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_health_care_and_social_assistance',
                name: 'Health care and social assistance %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Health care and social assistance %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 157,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 158,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_finance_and_insurance',
                name: 'Finance and insurance %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Finance and insurance %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 155,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 156,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_real_estate_and_rental_and_leasing',
                name: 'Real estate and rental and leasing %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Real estate and rental and leasing %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 173,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 174,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_information',
                name: 'Information %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Information %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 159,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 160,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_manufacturing',
                name: 'Manufacturing %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Manufacturing %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 163,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 164,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_other_services,_except_public_administration',
                name: 'Other services, except public administration %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Other services, except public administration %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 167,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 168,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_administrative_and_support_and_waste_management_services',
                name: 'Administrative and support and waste management services %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Administrative and support and waste management services %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 145,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 146,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_management_of_companies_and_enterprises',
                name: 'Management of companies and enterprises %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Management of companies and enterprises %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 161,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 162,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_professional,_scientific,_and_technical_services',
                name: 'Professional, scientific, and technical services %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Professional, scientific, and technical services %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 169,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 170,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_public_administration',
                name: 'Public administration %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Public administration %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 171,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 172,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_retail_trade',
                name: 'Retail trade %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Retail trade %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 175,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 176,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_transportation_and_warehousing',
                name: 'Transportation and warehousing %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Transportation and warehousing %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 177,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 178,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_utilities',
                name: 'Utilities %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Utilities %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 179,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 180,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'industry_wholesale_trade',
                name: 'Wholesale trade %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Wholesale trade %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 181,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 182,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'occupation',
        name: 'Occupation',
        contents: [
            {
                id: 'occupation_architecture_and_engineering_occupations',
                name: 'Architecture and engineering occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Architecture and engineering occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 215,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_computer_and_mathematical_occupations',
                name: 'Computer and mathematical occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Computer and mathematical occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 220,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_life,_physical,_and_social_science_occupations',
                name: 'Life, physical, and social science occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Life, physical, and social science occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 232,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_arts,_design,_entertainment,_sports,_and_media_occupations',
                name: 'Arts, design, entertainment, sports, and media occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Arts, design, entertainment, sports, and media occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 216,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_community_and_social_service_occupations',
                name: 'Community and social service occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Community and social service occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 219,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_educational_instruction,_and_library_occupations',
                name: 'Educational instruction, and library occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Educational instruction, and library occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 222,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_legal_occupations',
                name: 'Legal occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Legal occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 231,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations',
                name: 'Health diagnosing and treating practitioners and other technical occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Health diagnosing and treating practitioners and other technical occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 226,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_health_technologists_and_technicians',
                name: 'Health technologists and technicians %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Health technologists and technicians %',
                                stats: [
                                    {
                                        source: null,
                                        column: 227,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_business_and_financial_operations_occupations',
                name: 'Business and financial operations occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Business and financial operations occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 218,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_management_occupations',
                name: 'Management occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Management occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 233,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_construction_and_extraction_occupations',
                name: 'Construction and extraction occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Construction and extraction occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 221,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_farming,_fishing,_and_forestry_occupations',
                name: 'Farming, fishing, and forestry occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Farming, fishing, and forestry occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 223,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_installation,_maintenance,_and_repair_occupations',
                name: 'Installation, maintenance, and repair occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Installation, maintenance, and repair occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 229,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_material_moving_occupations',
                name: 'Material moving occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Material moving occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 234,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_production_occupations',
                name: 'Production occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Production occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 237,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_transportation_occupations',
                name: 'Transportation occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Transportation occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 239,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_office_and_administrative_support_occupations',
                name: 'Office and administrative support occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Office and administrative support occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 235,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_sales_and_related_occupations',
                name: 'Sales and related occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Sales and related occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 238,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_building_and_grounds_cleaning_and_maintenance_occupations',
                name: 'Building and grounds cleaning and maintenance occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Building and grounds cleaning and maintenance occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 217,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_food_preparation_and_serving_related_occupations',
                name: 'Food preparation and serving related occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Food preparation and serving related occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 225,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_healthcare_support_occupations',
                name: 'Healthcare support occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Healthcare support occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 228,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_personal_care_and_service_occupations',
                name: 'Personal care and service occupations %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Personal care and service occupations %',
                                stats: [
                                    {
                                        source: null,
                                        column: 236,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors',
                name: 'Firefighting and prevention, and other protective service workers including supervisors %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Firefighting and prevention, and other protective service workers including supervisors %',
                                stats: [
                                    {
                                        source: null,
                                        column: 224,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'occupation_law_enforcement_workers_including_supervisors',
                name: 'Law enforcement workers including supervisors %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Law enforcement workers including supervisors %',
                                stats: [
                                    {
                                        source: null,
                                        column: 230,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'relationships',
        name: 'Relationships',
        contents: [
            {
                id: 'sors_unpartnered_householder',
                name: 'Not Cohabiting With Partner %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Not Cohabiting With Partner %',
                                stats: [
                                    {
                                        source: null,
                                        column: 281,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'sors_cohabiting_partnered_gay',
                name: 'Cohabiting With Partner (Gay) %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Cohabiting With Partner (Gay) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 278,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'sors_cohabiting_partnered_straight',
                name: 'Cohabiting With Partner (Straight) %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Cohabiting With Partner (Straight) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 279,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'sors_child',
                name: 'Living With Parents %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Living With Parents %',
                                stats: [
                                    {
                                        source: null,
                                        column: 277,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'sors_other',
                name: 'Other Living Situation %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Other Living Situation %',
                                stats: [
                                    {
                                        source: null,
                                        column: 280,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'marriage_never_married',
                name: 'Never Married %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Never Married %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 199,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 200,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'marriage_married_not_divorced',
                name: 'Married (not divorced) %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Married (not divorced) %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 197,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 198,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'marriage_divorced',
                name: 'Divorced %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Divorced %',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 195,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 196,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'election',
        name: 'Election',
        contents: [
            {
                id: '2020 Presidential Election-margin',
                name: '2020 Presidential Election',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '2020 Presidential Election',
                                stats: [
                                    {
                                        source: null,
                                        column: 2,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: '2016 Presidential Election-margin',
                name: '2016 Presidential Election',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '2016 Presidential Election',
                                stats: [
                                    {
                                        source: null,
                                        column: 0,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: '2016-2020 Swing-margin',
                name: '2016-2020 Swing',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: '2016-2020 Swing',
                                stats: [
                                    {
                                        source: null,
                                        column: 1,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'distance_from_features',
        name: 'Distance from Features',
        contents: [
            {
                id: 'park_percent_1km_v2',
                name: 'PW Mean % of parkland within 1km',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Mean % of parkland within 1km',
                                stats: [
                                    {
                                        source: null,
                                        column: 243,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'within_Hospital_10',
                name: 'Within 10km of Hospital %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Within 10km of Hospital %',
                                stats: [
                                    {
                                        source: null,
                                        column: 311,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'mean_dist_Hospital_updated',
                name: 'Mean distance to nearest Hospital',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean distance to nearest Hospital',
                                stats: [
                                    {
                                        source: null,
                                        column: 203,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'within_Public School_2',
                name: 'Within 2km of Public School %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Within 2km of Public School %',
                                stats: [
                                    {
                                        source: null,
                                        column: 312,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'mean_dist_Public School_updated',
                name: 'Mean distance to nearest Public School',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean distance to nearest Public School',
                                stats: [
                                    {
                                        source: null,
                                        column: 204,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'within_Airport_30',
                name: 'Within 30km of Airport %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Within 30km of Airport %',
                                stats: [
                                    {
                                        source: null,
                                        column: 310,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'mean_dist_Airport_updated',
                name: 'Mean distance to nearest Airport',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean distance to nearest Airport',
                                stats: [
                                    {
                                        source: null,
                                        column: 202,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'within_Active Superfund Site_10',
                name: 'Within 10km of Active Superfund Site %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Within 10km of Active Superfund Site %',
                                stats: [
                                    {
                                        source: null,
                                        column: 309,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'mean_dist_Active Superfund Site_updated',
                name: 'Mean distance to nearest Active Superfund Site',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean distance to nearest Active Superfund Site',
                                stats: [
                                    {
                                        source: null,
                                        column: 201,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'lapophalfshare_usda_fra_1',
                name: 'Within 0.5mi of a grocery store %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Within 0.5mi of a grocery store %',
                                stats: [
                                    {
                                        source: null,
                                        column: 193,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'lapop1share_usda_fra_1',
                name: 'Within 1mi of a grocery store %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Within 1mi of a grocery store %',
                                stats: [
                                    {
                                        source: null,
                                        column: 191,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'lapop10share_usda_fra_1',
                name: 'Within 10mi of a grocery store %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Within 10mi of a grocery store %',
                                stats: [
                                    {
                                        source: null,
                                        column: 190,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'lapop20share_usda_fra_1',
                name: 'Within 20mi of a grocery store %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Within 20mi of a grocery store %',
                                stats: [
                                    {
                                        source: null,
                                        column: 192,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'weather',
        name: 'Weather',
        contents: [
            {
                id: 'mean_high_temp_4',
                name: 'Mean high temp',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean high temp',
                                stats: [
                                    {
                                        source: null,
                                        column: 207,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'mean_high_heat_index_4',
                name: 'Mean high heat index',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean high heat index',
                                stats: [
                                    {
                                        source: null,
                                        column: 206,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'mean_high_dewpoint_4',
                name: 'Mean high dewpt',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean high dewpt',
                                stats: [
                                    {
                                        source: null,
                                        column: 205,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'days_above_90_4',
                name: 'High temperature Above 90\u00b0F %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'High temperature Above 90\u00b0F %',
                                stats: [
                                    {
                                        source: null,
                                        column: 68,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'days_between_40_and_90_4',
                name: 'High temperature Between 40 and 90\u00b0F %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'High temperature Between 40 and 90\u00b0F %',
                                stats: [
                                    {
                                        source: null,
                                        column: 70,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'days_below_40_4',
                name: 'High temperature Below 40\u00b0F %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'High temperature Below 40\u00b0F %',
                                stats: [
                                    {
                                        source: null,
                                        column: 69,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'days_dewpoint_70_inf_4',
                name: 'Humid days (dewpt > 70\u00b0F) %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Humid days (dewpt > 70\u00b0F) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 73,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'days_dewpoint_50_70_4',
                name: 'Non-humid days (50\u00b0F < dewpt < 70\u00b0F) %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Non-humid days (50\u00b0F < dewpt < 70\u00b0F) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 72,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'days_dewpoint_-inf_50_4',
                name: 'Dry days (dewpt < 50\u00b0F) %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Dry days (dewpt < 50\u00b0F) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 71,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'hours_sunny_4',
                name: 'Mean sunny hours',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean sunny hours',
                                stats: [
                                    {
                                        source: null,
                                        column: 127,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'rainfall_4',
                name: 'Rainfall',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Rainfall',
                                stats: [
                                    {
                                        source: null,
                                        column: 251,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'snowfall_4',
                name: 'Snowfall [rain-equivalent]',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Snowfall [rain-equivalent]',
                                stats: [
                                    {
                                        source: null,
                                        column: 276,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'wind_speed_over_10mph_4',
                name: 'High windspeed (>10mph) days %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'High windspeed (>10mph) days %',
                                stats: [
                                    {
                                        source: null,
                                        column: 308,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'mean_high_temp_summer_4',
                name: 'Mean high temperature in summer',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean high temperature in summer',
                                stats: [
                                    {
                                        source: null,
                                        column: 210,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'mean_high_temp_winter_4',
                name: 'Mean high temperature in winter',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean high temperature in winter',
                                stats: [
                                    {
                                        source: null,
                                        column: 211,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'mean_high_temp_fall_4',
                name: 'Mean high temperature in fall',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean high temperature in fall',
                                stats: [
                                    {
                                        source: null,
                                        column: 208,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'mean_high_temp_spring_4',
                name: 'Mean high temperature in spring',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Mean high temperature in spring',
                                stats: [
                                    {
                                        source: null,
                                        column: 209,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'misc',
        name: 'Miscellaneous',
        contents: [
            {
                id: 'internet_no_access',
                name: 'No internet access %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'No internet access %',
                                stats: [
                                    {
                                        source: null,
                                        column: 186,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'insurance_coverage_none',
                name: 'Uninsured %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Uninsured %',
                                stats: [
                                    {
                                        source: null,
                                        column: 184,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'insurance_coverage_govt',
                name: 'Public Insurance %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Public Insurance %',
                                stats: [
                                    {
                                        source: null,
                                        column: 183,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'insurance_coverage_private',
                name: 'Private Insurance %',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Private Insurance %',
                                stats: [
                                    {
                                        source: null,
                                        column: 185,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'other_densities',
        name: 'Other Density Metrics',
        contents: [
            {
                id: 'ad_0.25',
                name: 'PW Density (r=250m)',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=250m)',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 29,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 74,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=250m) (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 31,
                                    },
                                ],
                            },
                            {
                                name: 'PW Density (r=250m) Change (2010-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 33,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=250m) (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 30,
                                    },
                                ],
                            },
                            {
                                name: 'PW Density (r=250m) Change (2000-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 32,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'ad_0.5',
                name: 'PW Density (r=500m)',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=500m)',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 34,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 75,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=500m) (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 36,
                                    },
                                ],
                            },
                            {
                                name: 'PW Density (r=500m) Change (2010-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 38,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=500m) (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 35,
                                    },
                                ],
                            },
                            {
                                name: 'PW Density (r=500m) Change (2000-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 37,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'ad_2',
                name: 'PW Density (r=2km)',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=2km)',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 44,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 77,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'GHSL',
                                        },
                                        column: 106,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=2km) (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 46,
                                    },
                                ],
                            },
                            {
                                name: 'PW Density (r=2km) Change (2010-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 48,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=2km) (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 45,
                                    },
                                ],
                            },
                            {
                                name: 'PW Density (r=2km) Change (2000-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 47,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'ad_4',
                name: 'PW Density (r=4km)',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=4km)',
                                stats: [
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'US Census',
                                        },
                                        column: 49,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'Canadian Census',
                                        },
                                        column: 78,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'GHSL',
                                        },
                                        column: 107,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2010,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=4km) (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 51,
                                    },
                                ],
                            },
                            {
                                name: 'PW Density (r=4km) Change (2010-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 53,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        year: 2000,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=4km) (2000)',
                                stats: [
                                    {
                                        source: null,
                                        column: 50,
                                    },
                                ],
                            },
                            {
                                name: 'PW Density (r=4km) Change (2000-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 52,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
] as const
