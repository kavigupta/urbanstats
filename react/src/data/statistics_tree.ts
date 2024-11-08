export const dataSources = [
    {
        category: 'Population',
        sources: [
            'US Census',
            'GHSL',
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
                                        column: 198,
                                    },
                                    {
                                        source: {
                                            category: 'Population',
                                            name: 'GHSL',
                                        },
                                        column: 90,
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
                                        column: 200,
                                    },
                                ],
                            },
                            {
                                name: 'Population Change (2010-2020)',
                                stats: [
                                    {
                                        source: null,
                                        column: 202,
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
                                        column: 199,
                                    },
                                ],
                            },
                            {
                                name: 'Population Change (2000-2020)',
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
                                        source: null,
                                        column: 39,
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
                                        source: null,
                                        column: 215,
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
                                        column: 217,
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
                                        column: 216,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'gpw_pw_density_1',
                name: 'PW Density (r=1km) [GHS-POP]',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=1km) [GHS-POP]',
                                stats: [
                                    {
                                        source: null,
                                        column: 91,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'gpw_aw_density',
                name: 'AW Density [GHS-POP]',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'AW Density [GHS-POP]',
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
                                        column: 253,
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
                                        column: 255,
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
                                        column: 254,
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
                                name: 'Hispanic % (2010)',
                                stats: [
                                    {
                                        source: null,
                                        column: 105,
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
                                        column: 104,
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
                                        column: 166,
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
                                        column: 168,
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
                                        column: 167,
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
                                        column: 94,
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
                                        column: 96,
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
                                        column: 95,
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
                                        column: 194,
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
                                        column: 196,
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
                                        column: 195,
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
                                        column: 106,
                                    },
                                ],
                            },
                            {
                                name: 'Racial Homogeneity Change (2000-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 109,
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
                                        column: 107,
                                    },
                                ],
                            },
                            {
                                name: 'Racial Homogeneity Change (2010-2020) %',
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
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'Racial Homogeneity %',
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
                                        column: 223,
                                    },
                                ],
                            },
                            {
                                name: 'Segregation Change (2000-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 226,
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
                                        column: 224,
                                    },
                                ],
                            },
                            {
                                name: 'Segregation Change (2010-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 227,
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
                                        column: 225,
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
                                        column: 218,
                                    },
                                ],
                            },
                            {
                                name: 'Mean Local Segregation Change (2000-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 221,
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
                                        column: 219,
                                    },
                                ],
                            },
                            {
                                name: 'Mean Local Segregation Change (2010-2020) %',
                                stats: [
                                    {
                                        source: null,
                                        column: 222,
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
                                        column: 220,
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
                                        column: 145,
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
                                        column: 147,
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
                                        column: 146,
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
                                        column: 78,
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
                                        column: 79,
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
                                        column: 77,
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
                                        column: 76,
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
                                        column: 75,
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
                                        column: 74,
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
                                        column: 81,
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
                                        column: 82,
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
                                        column: 80,
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
                                        source: null,
                                        column: 88,
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
                                        source: null,
                                        column: 84,
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
                                        column: 203,
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
                                        column: 114,
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
                                        column: 112,
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
                                        column: 113,
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
                                        column: 120,
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
                                        column: 118,
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
                                        column: 119,
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
                                        column: 115,
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
                                        column: 117,
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
                                        column: 116,
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
                                        column: 247,
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
                                name: 'Vacancy % (2000)',
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
                                        column: 213,
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
                                        column: 211,
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
                                        column: 212,
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
                                        column: 207,
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
                                        column: 205,
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
                                        column: 206,
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
                                        column: 210,
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
                                        column: 208,
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
                                        column: 209,
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
                                        column: 261,
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
                                        column: 262,
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
                                        column: 263,
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
                                        column: 264,
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
                                        column: 265,
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
                                        column: 266,
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
                                        column: 214,
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
                                        column: 243,
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
                                        column: 242,
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
                                        column: 245,
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
                                        column: 244,
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
                                        column: 246,
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
                                        source: null,
                                        column: 240,
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
                                        column: 252,
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
                                        column: 250,
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
                                        column: 251,
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
                                        column: 235,
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
                                        column: 237,
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
                                        column: 234,
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
                                        column: 236,
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
                                        column: 102,
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
                                        column: 98,
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
                                        column: 97,
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
                                        column: 99,
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
                                        column: 101,
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
                                        column: 100,
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
                                        source: null,
                                        column: 123,
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
                                        source: null,
                                        column: 121,
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
                                        source: null,
                                        column: 125,
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
                                        source: null,
                                        column: 126,
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
                                        source: null,
                                        column: 136,
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
                                        source: null,
                                        column: 122,
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
                                        source: null,
                                        column: 134,
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
                                        source: null,
                                        column: 139,
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
                                        source: null,
                                        column: 140,
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
                                        column: 169,
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
                                        column: 174,
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
                                        column: 186,
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
                                        column: 170,
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
                                        column: 173,
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
                                        column: 176,
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
                                        column: 185,
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
                                        column: 180,
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
                                        column: 181,
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
                                        column: 172,
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
                                        column: 187,
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
                                        column: 175,
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
                                        column: 177,
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
                                        column: 183,
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
                                        column: 188,
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
                                        column: 191,
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
                                        column: 193,
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
                                        column: 189,
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
                                        column: 192,
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
                                        column: 171,
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
                                        column: 179,
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
                                        column: 182,
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
                                        column: 190,
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
                                        column: 178,
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
                                        column: 184,
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
                                        column: 233,
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
                                        column: 230,
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
                                        column: 231,
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
                                        column: 229,
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
                                        column: 232,
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
                                        source: null,
                                        column: 154,
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
                                        source: null,
                                        column: 153,
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
                                        source: null,
                                        column: 152,
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
                                        column: 197,
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
                                        column: 259,
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
                                        column: 157,
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
                                        column: 260,
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
                                        column: 158,
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
                                        column: 258,
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
                                        column: 156,
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
                                        column: 257,
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
                                        column: 155,
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
                                        column: 151,
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
                                        column: 149,
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
                                        column: 148,
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
                                        column: 150,
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
                                        column: 161,
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
                                        column: 160,
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
                                        column: 159,
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
                                        column: 111,
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
                                        column: 204,
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
                                        column: 228,
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
                                        column: 256,
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
                                        column: 164,
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
                                        column: 165,
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
                                        column: 162,
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
                                        column: 163,
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
                                        column: 144,
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
                                        column: 142,
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
                                        column: 141,
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
                                        column: 143,
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
                                        source: null,
                                        column: 29,
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
                                        source: null,
                                        column: 34,
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
                                        source: null,
                                        column: 44,
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
                                        source: null,
                                        column: 49,
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
            {
                id: 'gpw_pw_density_2',
                name: 'PW Density (r=2km) [GHS-POP]',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=2km) [GHS-POP]',
                                stats: [
                                    {
                                        source: null,
                                        column: 92,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'gpw_pw_density_4',
                name: 'PW Density (r=4km) [GHS-POP]',
                contents: [
                    {
                        year: 2020,
                        stats_by_source: [
                            {
                                name: 'PW Density (r=4km) [GHS-POP]',
                                stats: [
                                    {
                                        source: null,
                                        column: 93,
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
