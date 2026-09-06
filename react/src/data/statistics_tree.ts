export const dataSources = [
    {
        "category": "Population",
        "sources": [
            {
                "category": "Population",
                "name": "US Census",
                "is_default": true
            },
            {
                "category": "Population",
                "name": "Canadian Census",
                "is_default": true
            },
            {
                "category": "Population",
                "name": "GHSL",
                "is_default": false
            }
        ]
    },
    {
        "category": "Geography",
        "sources": [
            {
                "category": "Geography",
                "name": "Shapefile Geometry",
                "is_default": true
            }
        ]
    },
    {
        "category": "Elevation",
        "sources": [
            {
                "category": "Elevation",
                "name": "ASTER GDEM",
                "is_default": true
            }
        ]
    },
    {
        "category": "Traffic Fatalities",
        "sources": [
            {
                "category": "Traffic Fatalities",
                "name": "NHTSA FARS",
                "is_default": true
            }
        ]
    },
    {
        "category": "Health",
        "sources": [
            {
                "category": "Health",
                "name": "CDC PLACES",
                "is_default": true
            }
        ]
    },
    {
        "category": "Health Care Performance",
        "sources": [
            {
                "category": "Health Care Performance",
                "name": "IHME",
                "is_default": true
            }
        ]
    },
    {
        "category": "Pollution",
        "sources": [
            {
                "category": "Pollution",
                "name": "Atmospheric Composition Analysis Group",
                "is_default": true
            }
        ]
    },
    {
        "category": "US Elections",
        "sources": [
            {
                "category": "US Elections",
                "name": "US Election Data",
                "is_default": true
            }
        ]
    },
    {
        "category": "Canadian Elections",
        "sources": [
            {
                "category": "Canadian Elections",
                "name": "Elections Canada",
                "is_default": true
            }
        ]
    },
    {
        "category": "Metadata",
        "sources": [
            {
                "category": "Metadata",
                "name": "Article Metadata",
                "is_default": true
            }
        ]
    },
    {
        "category": "Distance from Features",
        "sources": [
            {
                "category": "Distance from Features",
                "name": "Feature Datasets",
                "is_default": true
            }
        ]
    },
    {
        "category": "Food Access",
        "sources": [
            {
                "category": "Food Access",
                "name": "USDA Food Access Research Atlas",
                "is_default": true
            }
        ]
    },
    {
        "category": "Weather",
        "sources": [
            {
                "category": "Weather",
                "name": "ERA5",
                "is_default": true
            }
        ]
    }
] as const

export const rawStatsTree = [
    {
        "id": "main",
        "name": "Main",
        "contents": [
            {
                "id": "population",
                "name": "Population",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Population",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 399
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 403
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "GHSL"
                                        },
                                        "column": 215
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Population (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 401
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 402
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "Population Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 405
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 406
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Population (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 400
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "Population Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 404
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "ad_1",
                "name": "PW Density (r=1km)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=1km)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 92
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 171
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "GHSL"
                                        },
                                        "column": 216
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=1km) (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 104
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 161
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "PW Density (r=1km) Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 106
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 181
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=1km) (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 103
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "PW Density (r=1km) Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 105
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "sd",
                "name": "AW Density",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "AW Density",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 430
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 434
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "GHSL"
                                        },
                                        "column": 214
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "AW Density (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 432
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 433
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "AW Density (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 431
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "area",
                "name": "Area",
                "subcategory": null,
                "contents": [
                    {
                        "year": null,
                        "stats_by_source": [
                            {
                                "name": "Area",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Geography",
                                            "name": "Shapefile Geometry"
                                        },
                                        "column": 132
                                    }
                                ],
                                "indentedName": null
                            }
                        ]
                    }
                ]
            },
            {
                "id": "compactness",
                "name": "Compactness",
                "subcategory": null,
                "contents": [
                    {
                        "year": null,
                        "stats_by_source": [
                            {
                                "name": "Compactness",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Geography",
                                            "name": "Shapefile Geometry"
                                        },
                                        "column": 150
                                    }
                                ],
                                "indentedName": null
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "topography",
        "name": "Topography",
        "contents": [
            {
                "id": "gridded_hilliness",
                "name": "PW Mean Hilliness (Grade)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Mean Hilliness (Grade)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Elevation",
                                            "name": "ASTER GDEM"
                                        },
                                        "column": 225
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "gridded_elevation",
                "name": "PW Mean Elevation",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Mean Elevation",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Elevation",
                                            "name": "ASTER GDEM"
                                        },
                                        "column": 224
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "race",
        "name": "Race",
        "contents": [
            {
                "id": "white",
                "name": "White %",
                "subcategory": {
                    "id": "race_composition",
                    "name": "Racial Composition"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "White %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 484
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 487
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "White % (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 486
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "White % (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 485
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "hispanic",
                "name": "Hispanic %",
                "subcategory": {
                    "id": "race_composition",
                    "name": "Racial Composition"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Hispanic %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 236
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 239
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Hispanic % (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 238
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Hispanic % (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 237
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "black",
                "name": "Black %",
                "subcategory": {
                    "id": "race_composition",
                    "name": "Racial Composition"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Black %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 140
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 143
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Black % (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 142
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Black % (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 141
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "asian",
                "name": "Asian %",
                "subcategory": {
                    "id": "race_composition",
                    "name": "Racial Composition"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Asian %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 133
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 136
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Asian % (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 135
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Asian % (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 134
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "native",
                "name": "Native %",
                "subcategory": {
                    "id": "race_composition",
                    "name": "Racial Composition"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Native %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 353
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 356
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Native % (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 355
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Native % (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 354
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "hawaiian_pi",
                "name": "Hawaiian / PI %",
                "subcategory": {
                    "id": "race_composition",
                    "name": "Racial Composition"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Hawaiian / PI %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 226
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 229
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Hawaiian / PI % (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 228
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Hawaiian / PI % (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 227
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "other  slash  mixed",
                "name": "Other / Mixed %",
                "subcategory": {
                    "id": "race_composition",
                    "name": "Racial Composition"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Other / Mixed %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 392
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 395
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Other / Mixed % (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 394
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Other / Mixed % (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 393
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "homogeneity_250",
                "name": "Racial Homogeneity %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Racial Homogeneity (2000) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 240
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "Racial Homogeneity Change (2000-2020) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 243
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Racial Homogeneity (2010) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 241
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "Racial Homogeneity Change (2010-2020) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 244
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Racial Homogeneity %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 242
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "segregation_250",
                "name": "Segregation %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Segregation (2000) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 440
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "Segregation Change (2000-2020) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 443
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Segregation (2010) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 441
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "Segregation Change (2010-2020) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 444
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Segregation %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 442
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "segregation_250_10",
                "name": "Mean Local Segregation %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Mean Local Segregation (2000) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 435
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "Mean Local Segregation Change (2000-2020) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 438
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Mean Local Segregation (2010) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 436
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "Mean Local Segregation Change (2010-2020) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 439
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean Local Segregation %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 437
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "national_origin",
        "name": "National Origin",
        "contents": [
            {
                "id": "citizenship_citizen_by_birth",
                "name": "Citizen by Birth %",
                "subcategory": {
                    "id": "citizenship",
                    "name": "Citizenship"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Citizen by Birth %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 144
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 145
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "citizenship_citizen_by_naturalization",
                "name": "Citizen by Naturalization %",
                "subcategory": {
                    "id": "citizenship",
                    "name": "Citizenship"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Citizen by Naturalization %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 146
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 147
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "citizenship_not_citizen",
                "name": "Non-citizen %",
                "subcategory": {
                    "id": "citizenship",
                    "name": "Citizenship"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Non-citizen %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 148
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 149
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "birthplace_non_us",
                "name": "Born outside US %",
                "subcategory": {
                    "id": "birthplace",
                    "name": "Birthplace"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Born outside US %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 137
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "birthplace_us_not_state",
                "name": "Born in us outside state %",
                "subcategory": {
                    "id": "birthplace",
                    "name": "Birthplace"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Born in us outside state %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 138
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "birthplace_us_state",
                "name": "Born in state of residence %",
                "subcategory": {
                    "id": "birthplace",
                    "name": "Birthplace"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Born in state of residence %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 139
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "language_english_only",
                "name": "Only English at Home %",
                "subcategory": {
                    "id": "language",
                    "name": "Language at Home"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Only English at Home %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 312
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 313
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "language_spanish",
                "name": "Spanish at Home %",
                "subcategory": {
                    "id": "language",
                    "name": "Language at Home"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Spanish at Home %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 317
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 318
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "language_french_canada",
                "name": "French at Home % [StatCan]",
                "subcategory": {
                    "id": "language",
                    "name": "Language at Home"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "French at Home % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 314
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "language_other_non_french_canada",
                "name": "Other (non-French) at Home % [StatCan]",
                "subcategory": {
                    "id": "language",
                    "name": "Language at Home"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Other (non-French) at Home % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 316
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "language_other",
                "name": "Other at Home %",
                "subcategory": {
                    "id": "language",
                    "name": "Language at Home"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Other at Home %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 315
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "religion",
        "name": "Religion",
        "contents": [
            {
                "id": "religion_no_religion_canada",
                "name": "No religion % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "No religion % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 414
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "religion_catholic_canada",
                "name": "Catholic % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Catholic % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 410
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "religion_protestant_canada",
                "name": "Protestant (non-Catholic Christian) % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Protestant (non-Catholic Christian) % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 416
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "religion_hindu_canada",
                "name": "Hindu % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Hindu % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 411
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "religion_jewish_canada",
                "name": "Jewish % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Jewish % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 412
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "religion_muslim_canada",
                "name": "Muslim % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Muslim % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 413
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "religion_sikh_canada",
                "name": "Sikh % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Sikh % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 417
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "religion_buddhist_canada",
                "name": "Buddhist % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Buddhist % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 409
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "religion_other_canada",
                "name": "Other religion % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Other religion % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 415
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "education",
        "name": "Education",
        "contents": [
            {
                "id": "education_high_school",
                "name": "High School %",
                "subcategory": {
                    "id": "education_attainment",
                    "name": "Educational Attainment"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "High School %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 195
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_ugrad",
                "name": "Undergrad %",
                "subcategory": {
                    "id": "education_attainment",
                    "name": "Educational Attainment"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Undergrad %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 197
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_grad",
                "name": "Grad %",
                "subcategory": {
                    "id": "education_attainment",
                    "name": "Educational Attainment"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Grad %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 193
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_high_school_canada",
                "name": "High school diploma [25-64] %",
                "subcategory": {
                    "id": "education_attainment",
                    "name": "Educational Attainment"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "High school diploma [25-64] %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 196
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_ugrad_canada",
                "name": "Bachelor's degree [25-64] %",
                "subcategory": {
                    "id": "education_attainment",
                    "name": "Educational Attainment"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Bachelor's degree [25-64] %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 198
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_grad_canada",
                "name": "Graduate degree [25-64] %",
                "subcategory": {
                    "id": "education_attainment",
                    "name": "Educational Attainment"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Graduate degree [25-64] %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 194
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_field_stem",
                "name": "Undergrad STEM %",
                "subcategory": {
                    "id": "education_field",
                    "name": "Field of Study"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Undergrad STEM %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 191
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_field_humanities",
                "name": "Undergrad Humanities %",
                "subcategory": {
                    "id": "education_field",
                    "name": "Field of Study"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Undergrad Humanities %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 189
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_field_business",
                "name": "Undergrad Business %",
                "subcategory": {
                    "id": "education_field",
                    "name": "Field of Study"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Undergrad Business %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 187
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_field_stem_canada",
                "name": "Undergrad STEM [25-64] % [StatCan]",
                "subcategory": {
                    "id": "education_field",
                    "name": "Field of Study"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Undergrad STEM [25-64] % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 192
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_field_humanities_canada",
                "name": "Undergrad Humanities [25-64] % [StatCan]",
                "subcategory": {
                    "id": "education_field",
                    "name": "Field of Study"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Undergrad Humanities [25-64] % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 190
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "education_field_business_canada",
                "name": "Undergrad Business [25-64] % [StatCan]",
                "subcategory": {
                    "id": "education_field",
                    "name": "Field of Study"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Undergrad Business [25-64] % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 188
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "female_hs_gap_4",
                "name": "% of women with high school education - % of men with high school education",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "% of women with high school education - % of men with high school education",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 200
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "female_ugrad_gap_4",
                "name": "% of women with undergraduate education - % of men with undergraduate education",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "% of women with undergraduate education - % of men with undergraduate education",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 201
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "female_grad_gap_4",
                "name": "% of women with graduate education - % of men with graduate education",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "% of women with graduate education - % of men with graduate education",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 199
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "generation",
        "name": "Generation",
        "contents": [
            {
                "id": "generation_silent",
                "name": "Silent %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Silent %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 212
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 213
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "generation_boomer",
                "name": "Boomer %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Boomer %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 202
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 203
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "generation_genx",
                "name": "Gen X %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Gen X %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 206
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 207
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "generation_millenial",
                "name": "Millennial %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Millennial %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 210
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 211
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "generation_genz",
                "name": "Gen Z %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Gen Z %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 208
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 209
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "generation_genalpha",
                "name": "Gen Alpha %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Gen Alpha %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 204
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 205
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "income",
        "name": "Income",
        "contents": [
            {
                "id": "median_household_income",
                "name": "Median Household Income (USD)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Median Household Income (USD)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 352
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "poverty_below_line",
                "name": "Poverty %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Poverty %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 407
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "lico_at_canada",
                "name": "LICO-AT %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "LICO-AT %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 323
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "lim_at_canada",
                "name": "LIM-AT %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "LIM-AT %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 325
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "household_income_under_50k",
                "name": "Household Income < $50k %",
                "subcategory": {
                    "id": "household_income",
                    "name": "Household Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Household Income < $50k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 251
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "household_income_50k_to_100k",
                "name": "Household Income $50k - $100k %",
                "subcategory": {
                    "id": "household_income",
                    "name": "Household Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Household Income $50k - $100k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 247
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "household_income_over_100k",
                "name": "Household Income > $100k %",
                "subcategory": {
                    "id": "household_income",
                    "name": "Household Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Household Income > $100k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 249
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "household_income_under_50cad",
                "name": "Household income < C$50k %",
                "subcategory": {
                    "id": "household_income",
                    "name": "Household Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Household income < C$50k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 250
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "household_income_50_to_100cad",
                "name": "Household income C$50k - C$100k %",
                "subcategory": {
                    "id": "household_income",
                    "name": "Household Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Household income C$50k - C$100k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 246
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "household_income_above_100_cad",
                "name": "Household income > C$100k %",
                "subcategory": {
                    "id": "household_income",
                    "name": "Household Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Household income > C$100k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 248
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "individual_income_under_50k",
                "name": "Individual Income < $50k %",
                "subcategory": {
                    "id": "individual_income",
                    "name": "Individual Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Individual Income < $50k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 267
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "individual_income_50k_to_100k",
                "name": "Individual Income $50k - $100k %",
                "subcategory": {
                    "id": "individual_income",
                    "name": "Individual Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Individual Income $50k - $100k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 263
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "individual_income_over_100k",
                "name": "Individual Income > $100k %",
                "subcategory": {
                    "id": "individual_income",
                    "name": "Individual Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Individual Income > $100k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 265
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "individual_income_under_50cad",
                "name": "Individual income < C$50k %",
                "subcategory": {
                    "id": "individual_income",
                    "name": "Individual Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Individual income < C$50k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 266
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "individual_income_50_to_100cad",
                "name": "Individual income C$50k - C$100k %",
                "subcategory": {
                    "id": "individual_income",
                    "name": "Individual Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Individual income C$50k - C$100k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 262
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "individual_income_above_100_cad",
                "name": "Individual income > C$100k %",
                "subcategory": {
                    "id": "individual_income",
                    "name": "Individual Income"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Individual income > C$100k %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 264
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "housing",
        "name": "Housing",
        "contents": [
            {
                "id": "housing_per_pop",
                "name": "Housing Units per Adult",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Housing Units per Adult",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 258
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 261
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Housing Units per Adult (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 260
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Housing Units per Adult (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 259
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "housing_per_person",
                "name": "Housing Units per Person",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Housing Units per Person",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 254
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 257
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Housing Units per Person (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 256
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Housing Units per Person (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 255
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "vacancy",
                "name": "Vacancy %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Vacancy %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 478
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "Vacancy % (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 480
                                    }
                                ],
                                "indentedName": "2010"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "Vacancy % (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 479
                                    }
                                ],
                                "indentedName": "2000"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_burden_under_20",
                "name": "Rent/Income < 20%",
                "subcategory": {
                    "id": "rent_burden",
                    "name": "Rent Burden"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Rent/Income < 20%",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 427
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_burden_20_to_40",
                "name": "Rent/Income 20%-40%",
                "subcategory": {
                    "id": "rent_burden",
                    "name": "Rent Burden"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Rent/Income 20%-40%",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 424
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_burden_over_40",
                "name": "Rent/Income > 40%",
                "subcategory": {
                    "id": "rent_burden",
                    "name": "Rent Burden"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Rent/Income > 40%",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 426
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_1br_under_750",
                "name": "1BR Rent < $750 %",
                "subcategory": {
                    "id": "rent_1br",
                    "name": "1BR Rent"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "1BR Rent < $750 %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 420
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_1br_750_to_1500",
                "name": "1BR Rent $750 - $1500 %",
                "subcategory": {
                    "id": "rent_1br",
                    "name": "1BR Rent"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "1BR Rent $750 - $1500 %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 418
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_1br_over_1500",
                "name": "1BR Rent > $1500 %",
                "subcategory": {
                    "id": "rent_1br",
                    "name": "1BR Rent"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "1BR Rent > $1500 %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 419
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_2br_under_750",
                "name": "2BR Rent < $750 %",
                "subcategory": {
                    "id": "rent_2br",
                    "name": "2BR Rent"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2BR Rent < $750 %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 423
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_2br_750_to_1500",
                "name": "2BR Rent $750 - $1500 %",
                "subcategory": {
                    "id": "rent_2br",
                    "name": "2BR Rent"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2BR Rent $750 - $1500 %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 421
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_2br_over_1500",
                "name": "2BR Rent > $1500 %",
                "subcategory": {
                    "id": "rent_2br",
                    "name": "2BR Rent"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2BR Rent > $1500 %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 422
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "year_built_1969_or_earlier",
                "name": "% units built pre-1970",
                "subcategory": {
                    "id": "year_built",
                    "name": "Year Built"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "% units built pre-1970",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 493
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "year_built_1970_to_1979",
                "name": "% units built in 1970s",
                "subcategory": {
                    "id": "year_built",
                    "name": "Year Built"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "% units built in 1970s",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 494
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "year_built_1980_to_1989",
                "name": "% units built in 1980s",
                "subcategory": {
                    "id": "year_built",
                    "name": "Year Built"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "% units built in 1980s",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 495
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "year_built_1990_to_1999",
                "name": "% units built in 1990s",
                "subcategory": {
                    "id": "year_built",
                    "name": "Year Built"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "% units built in 1990s",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 496
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "year_built_2000_to_2009",
                "name": "% units built in 2000s",
                "subcategory": {
                    "id": "year_built",
                    "name": "Year Built"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "% units built in 2000s",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 497
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "year_built_2010_or_later",
                "name": "% units built in 2010s+",
                "subcategory": {
                    "id": "year_built",
                    "name": "Year Built"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "% units built in 2010s+",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 498
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "household_size_pw",
                "name": "PW Household Size",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Household Size",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 252
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 253
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_or_own_rent",
                "name": "Renter %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Renter %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 428
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 429
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rent_burden_over_30_canada",
                "name": "Housing Cost/Income > 30% [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Housing Cost/Income > 30% [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 425
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "transportation",
        "name": "Transportation",
        "contents": [
            {
                "id": "transportation_means_car_no_wfh",
                "name": "Commute Car %",
                "subcategory": {
                    "id": "commute_mode",
                    "name": "Commute Mode"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Car %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 469
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 470
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_means_bike_no_wfh",
                "name": "Commute Bike %",
                "subcategory": {
                    "id": "commute_mode",
                    "name": "Commute Mode"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Bike %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 466
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 467
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_means_walk_no_wfh",
                "name": "Commute Walk %",
                "subcategory": {
                    "id": "commute_mode",
                    "name": "Commute Mode"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Walk %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 475
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 476
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_means_transit_no_wfh",
                "name": "Commute Transit %",
                "subcategory": {
                    "id": "commute_mode",
                    "name": "Commute Mode"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Transit %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 472
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 473
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_commute_time_median",
                "name": "Median Commute Time (min)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Median Commute Time (min)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 459
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 460
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_commute_time_under_15",
                "name": "Commute Time < 15 min %",
                "subcategory": {
                    "id": "commute_time",
                    "name": "Commute Time"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Time < 15 min %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 463
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 464
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_commute_time_15_to_29",
                "name": "Commute Time 15 - 29 min %",
                "subcategory": {
                    "id": "commute_time",
                    "name": "Commute Time"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Time 15 - 29 min %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 455
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 456
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_commute_time_30_to_59",
                "name": "Commute Time 30 - 59 min %",
                "subcategory": {
                    "id": "commute_time",
                    "name": "Commute Time"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Time 30 - 59 min %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 457
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 458
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_commute_time_over_60",
                "name": "Commute Time > 60 min %",
                "subcategory": {
                    "id": "commute_time",
                    "name": "Commute Time"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Time > 60 min %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 461
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 462
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "vehicle_ownership_none",
                "name": "Households With no Vehicle %",
                "subcategory": {
                    "id": "vehicle_ownership",
                    "name": "Vehicle Ownership"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Households With no Vehicle %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 483
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "vehicle_ownership_at_least_1",
                "name": "Households With 1+ Vehicles %",
                "subcategory": {
                    "id": "vehicle_ownership",
                    "name": "Vehicle Ownership"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Households With 1+ Vehicles %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 481
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "vehicle_ownership_at_least_2",
                "name": "Households With 2+ Vehicles %",
                "subcategory": {
                    "id": "vehicle_ownership",
                    "name": "Vehicle Ownership"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Households With 2+ Vehicles %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 482
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "traffic_fatalities_last_decade_per_capita",
                "name": "Traffic Fatalities Per Capita Per Year",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Traffic Fatalities Per Capita Per Year",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Traffic Fatalities",
                                            "name": "NHTSA FARS"
                                        },
                                        "column": 452
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "traffic_fatalities_ped_last_decade_per_capita",
                "name": "Pedestrian/Cyclist Fatalities Per Capita Per Year",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Pedestrian/Cyclist Fatalities Per Capita Per Year",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Traffic Fatalities",
                                            "name": "NHTSA FARS"
                                        },
                                        "column": 454
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "traffic_fatalities_last_decade",
                "name": "Total Traffic Fatalities In Last Decade",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Total Traffic Fatalities In Last Decade",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Traffic Fatalities",
                                            "name": "NHTSA FARS"
                                        },
                                        "column": 451
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "traffic_fatalities_ped_last_decade",
                "name": "Total Pedestrian/Cyclist Fatalities In Last Decade",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Total Pedestrian/Cyclist Fatalities In Last Decade",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Traffic Fatalities",
                                            "name": "NHTSA FARS"
                                        },
                                        "column": 453
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "health",
        "name": "Health",
        "contents": [
            {
                "id": "GHLTH_cdc_2",
                "name": "Fair or poor self-rated health status %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Fair or poor self-rated health status %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 70
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "PHLTH_cdc_2",
                "name": "Physical health not good for two weeks in last year %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Physical health not good for two weeks in last year %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 77
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "ARTHRITIS_cdc_2",
                "name": "Arthritis %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Arthritis %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 56
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "CASTHMA_cdc_2",
                "name": "Current asthma %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Current asthma %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 60
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "BPHIGH_cdc_2",
                "name": "High blood pressure %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "High blood pressure %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 58
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "CANCER_cdc_2",
                "name": "Cancer (excluding skin cancer) %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Cancer (excluding skin cancer) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 59
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "KIDNEY_cdc_2",
                "name": "Chronic kidney disease %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Chronic kidney disease %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 73
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "COPD_cdc_2",
                "name": "COPD %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "COPD %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 65
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "CHD_cdc_2",
                "name": "Coronary heart disease %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Coronary heart disease %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 61
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "DIABETES_cdc_2",
                "name": "Diagnosed diabetes %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Diagnosed diabetes %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 68
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "OBESITY_cdc_2",
                "name": "Obesity %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Obesity %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 76
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "STROKE_cdc_2",
                "name": "Stroke %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Stroke %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 80
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "DISABILITY_cdc_2",
                "name": "Disability %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Disability %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 69
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "HEARING_cdc_2",
                "name": "Hearing disability %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Hearing disability %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 71
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "VISION_cdc_2",
                "name": "Vision disability %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Vision disability %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 81
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "COGNITION_cdc_2",
                "name": "Cognitive disability %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Cognitive disability %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 64
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "MOBILITY_cdc_2",
                "name": "Mobility disability %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mobility disability %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 75
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "SELFCARE_cdc_2",
                "name": "Self-care disability %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Self-care disability %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 78
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "INDEPLIVE_cdc_2",
                "name": "Independent living disability %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Independent living disability %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 72
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "BINGE_cdc_2",
                "name": "Binge drinking among adults %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Binge drinking among adults %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 57
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "CSMOKING_cdc_2",
                "name": "Smoking %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Smoking %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 66
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "LPA_cdc_2",
                "name": "No leisure-time physical activity %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "No leisure-time physical activity %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 74
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "SLEEP_cdc_2",
                "name": "Sleeping less than 7 hours %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Sleeping less than 7 hours %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 79
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "CHECKUP_cdc_2",
                "name": "Attended doctor in last year %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Attended doctor in last year %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 62
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "DENTAL_cdc_2",
                "name": "Attended dentist in last year %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Attended dentist in last year %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 67
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "CHOLSCREEN_cdc_2",
                "name": "Cholesterol screening in last year %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Cholesterol screening in last year %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health",
                                            "name": "CDC PLACES"
                                        },
                                        "column": 63
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "life_expectancy_2019",
                "name": "Life Expectancy (2019)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Life Expectancy (2019)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health Care Performance",
                                            "name": "IHME"
                                        },
                                        "column": 324
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "performance_score_adj_2019",
                "name": "IHME Health Performance Score (2019)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "IHME Health Performance Score (2019)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Health Care Performance",
                                            "name": "IHME"
                                        },
                                        "column": 397
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "climate_change",
        "name": "Environment",
        "contents": [
            {
                "id": "pm_25_2018_2022",
                "name": "PW Mean PM2.5 Pollution",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Mean PM2.5 Pollution",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Pollution",
                                            "name": "Atmospheric Composition Analysis Group"
                                        },
                                        "column": 398
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "heating_utility_gas",
                "name": "Utility gas heating %",
                "subcategory": {
                    "id": "heating",
                    "name": "Heating Fuel"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Utility gas heating %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 235
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "heating_electricity",
                "name": "Electricity heating %",
                "subcategory": {
                    "id": "heating",
                    "name": "Heating Fuel"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Electricity heating %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 231
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "heating_bottled_tank_lp_gas",
                "name": "Bottled, tank, or LP gas heating %",
                "subcategory": {
                    "id": "heating",
                    "name": "Heating Fuel"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Bottled, tank, or LP gas heating %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 230
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "heating_feul_oil_kerosene",
                "name": "Fuel oil, kerosene, etc. heating %",
                "subcategory": {
                    "id": "heating",
                    "name": "Heating Fuel"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Fuel oil, kerosene, etc. heating %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 232
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "heating_other",
                "name": "Other fuel heating %",
                "subcategory": {
                    "id": "heating",
                    "name": "Heating Fuel"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Other fuel heating %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 234
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "heating_no",
                "name": "No heating %",
                "subcategory": {
                    "id": "heating",
                    "name": "Heating Fuel"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "No heating %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 233
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "industry",
        "name": "Industry",
        "contents": [
            {
                "id": "industry_agriculture,_forestry,_fishing_and_hunting",
                "name": "Employed in Agriculture, forestry, fishing and hunting %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Agriculture, forestry, fishing and hunting %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 272
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 273
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_mining,_quarrying,_and_oil_and_gas_extraction",
                "name": "Employed in Mining, quarrying, and oil and gas extraction %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Mining, quarrying, and oil and gas extraction %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 290
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 291
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_accommodation_and_food_services",
                "name": "Employed in Accommodation and food services %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Accommodation and food services %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 268
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 269
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_arts,_entertainment,_and_recreation",
                "name": "Employed in Arts, entertainment, and recreation %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Arts, entertainment, and recreation %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 274
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 275
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_construction",
                "name": "Employed in Construction %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Construction %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 276
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 277
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_educational_services",
                "name": "Employed in Educational services %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Educational services %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 278
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 279
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_health_care_and_social_assistance",
                "name": "Employed in Health care and social assistance %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Health care and social assistance %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 282
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 283
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_finance_and_insurance",
                "name": "Employed in Finance and insurance %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Finance and insurance %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 280
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 281
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_real_estate_and_rental_and_leasing",
                "name": "Employed in Real estate and rental and leasing %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Real estate and rental and leasing %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 298
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 299
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_information",
                "name": "Employed in Information %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Information %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 284
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 285
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_manufacturing",
                "name": "Employed in Manufacturing %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Manufacturing %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 288
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 289
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_other_services,_except_public_administration",
                "name": "Employed in Other services, except public administration %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Other services, except public administration %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 292
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 293
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_administrative_and_support_and_waste_management_services",
                "name": "Employed in Administrative and support and waste management services %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Administrative and support and waste management services %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 270
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 271
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_management_of_companies_and_enterprises",
                "name": "Employed in Management of companies and enterprises %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Management of companies and enterprises %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 286
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 287
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_professional,_scientific,_and_technical_services",
                "name": "Employed in Professional, scientific, and technical services %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Professional, scientific, and technical services %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 294
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 295
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_public_administration",
                "name": "Employed in Public administration %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Public administration %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 296
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 297
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_retail_trade",
                "name": "Employed in Retail trade %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Retail trade %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 300
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 301
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_transportation_and_warehousing",
                "name": "Employed in Transportation and warehousing %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Transportation and warehousing %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 302
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 303
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_utilities",
                "name": "Employed in Utilities %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Utilities %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 304
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 305
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "industry_wholesale_trade",
                "name": "Employed in Wholesale trade %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Employed in Wholesale trade %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 306
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 307
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "occupation",
        "name": "Occupation",
        "contents": [
            {
                "id": "occupation_architecture_and_engineering_occupations",
                "name": "Architecture and engineering occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Architecture and engineering occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 357
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_computer_and_mathematical_occupations",
                "name": "Computer and mathematical occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Computer and mathematical occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 364
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_life,_physical,_and_social_science_occupations",
                "name": "Life, physical, and social science occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Life, physical, and social science occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 379
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_arts,_design,_entertainment,_sports,_and_media_occupations",
                "name": "Arts, design, entertainment, sports, and media occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Arts, design, entertainment, sports, and media occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 359
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_community_and_social_service_occupations",
                "name": "Community and social service occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Community and social service occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 363
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_educational_instruction,_and_library_occupations",
                "name": "Educational instruction, and library occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Educational instruction, and library occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 367
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_legal_occupations",
                "name": "Legal occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Legal occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 377
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations",
                "name": "Health diagnosing and treating practitioners and other technical occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Health diagnosing and treating practitioners and other technical occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 372
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_health_technologists_and_technicians",
                "name": "Health technologists and technicians %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Health technologists and technicians %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 373
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_business_and_financial_operations_occupations",
                "name": "Business and financial operations occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Business and financial operations occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 361
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_management_occupations",
                "name": "Management occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Management occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 380
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_construction_and_extraction_occupations",
                "name": "Construction and extraction occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Construction and extraction occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 365
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_farming,_fishing,_and_forestry_occupations",
                "name": "Farming, fishing, and forestry occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Farming, fishing, and forestry occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 368
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_installation,_maintenance,_and_repair_occupations",
                "name": "Installation, maintenance, and repair occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Installation, maintenance, and repair occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 375
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_material_moving_occupations",
                "name": "Material moving occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Material moving occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 382
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_production_occupations",
                "name": "Production occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Production occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 387
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_transportation_occupations",
                "name": "Transportation occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Transportation occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 391
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_office_and_administrative_support_occupations",
                "name": "Office and administrative support occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Office and administrative support occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 385
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_sales_and_related_occupations",
                "name": "Sales and related occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Sales and related occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 388
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_building_and_grounds_cleaning_and_maintenance_occupations",
                "name": "Building and grounds cleaning and maintenance occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Building and grounds cleaning and maintenance occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 360
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_food_preparation_and_serving_related_occupations",
                "name": "Food preparation and serving related occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Food preparation and serving related occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 370
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_healthcare_support_occupations",
                "name": "Healthcare support occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Healthcare support occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 374
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_personal_care_and_service_occupations",
                "name": "Personal care and service occupations %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Personal care and service occupations %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 386
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors",
                "name": "Firefighting and prevention, and other protective service workers including supervisors %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Firefighting and prevention, and other protective service workers including supervisors %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 369
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_law_enforcement_workers_including_supervisors",
                "name": "Law enforcement workers including supervisors %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Law enforcement workers including supervisors %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 376
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_legislative_and_senior_management_canada",
                "name": "Legislative and senior management occupations % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Legislative and senior management occupations % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 378
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_business_finance_and_administration_canada",
                "name": "Business, finance and administration occupations % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Business, finance and administration occupations % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 362
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_natural_and_applied_sciences_canada",
                "name": "Natural and applied sciences occupations % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Natural and applied sciences occupations % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 383
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_health_canada",
                "name": "Health occupations % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Health occupations % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 371
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_education_law_social_community_government_canada",
                "name": "Education, law, social, community and government occupations % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Education, law, social, community and government occupations % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 366
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_art_culture_recreation_sport_canada",
                "name": "Art, culture, recreation and sport occupations % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Art, culture, recreation and sport occupations % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 358
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_sales_and_service_canada",
                "name": "Sales and service occupations % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Sales and service occupations % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 389
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_trades_transport_equipment_canada",
                "name": "Trades, transport and equipment operators occupations % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Trades, transport and equipment operators occupations % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 390
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_natural_resources_agriculture_canada",
                "name": "Natural resources and agriculture occupations % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Natural resources and agriculture occupations % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 384
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "occupation_manufacturing_utilities_canada",
                "name": "Manufacturing and utilities occupations % [StatCan]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Manufacturing and utilities occupations % [StatCan]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 381
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "relationships",
        "name": "Relationships",
        "contents": [
            {
                "id": "sors_unpartnered_householder",
                "name": "Not Cohabiting With Partner %",
                "subcategory": {
                    "id": "household_relationship",
                    "name": "Household Relationship"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Not Cohabiting With Partner %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 450
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "sors_cohabiting_partnered_gay",
                "name": "Cohabiting With Partner (Gay) %",
                "subcategory": {
                    "id": "household_relationship",
                    "name": "Household Relationship"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Cohabiting With Partner (Gay) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 447
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "sors_cohabiting_partnered_straight",
                "name": "Cohabiting With Partner (Straight) %",
                "subcategory": {
                    "id": "household_relationship",
                    "name": "Household Relationship"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Cohabiting With Partner (Straight) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 448
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "sors_child",
                "name": "Living With Parents %",
                "subcategory": {
                    "id": "household_relationship",
                    "name": "Household Relationship"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Living With Parents %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 446
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "sors_other",
                "name": "Other Living Situation %",
                "subcategory": {
                    "id": "household_relationship",
                    "name": "Household Relationship"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Other Living Situation %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 449
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "marriage_never_married",
                "name": "Never Married %",
                "subcategory": {
                    "id": "marital_status",
                    "name": "Marital Status"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Never Married %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 330
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 331
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "marriage_married_not_divorced",
                "name": "Married (not divorced) %",
                "subcategory": {
                    "id": "marital_status",
                    "name": "Marital Status"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Married (not divorced) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 328
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 329
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "marriage_divorced",
                "name": "Divorced %",
                "subcategory": {
                    "id": "marital_status",
                    "name": "Marital Status"
                },
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Divorced %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 326
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 327
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "election",
        "name": "Election",
        "contents": [
            {
                "id": "us_presidential_election",
                "name": "US Presidential Election",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "2008 Presidential Election",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "US Elections",
                                            "name": "US Election Data"
                                        },
                                        "column": 0
                                    }
                                ],
                                "indentedName": "2008"
                            },
                            {
                                "name": "2008-2012 Swing",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "US Elections",
                                            "name": "US Election Data"
                                        },
                                        "column": 1
                                    }
                                ],
                                "indentedName": "2008-2012 Swing"
                            },
                            {
                                "name": "2012 Presidential Election",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "US Elections",
                                            "name": "US Election Data"
                                        },
                                        "column": 2
                                    }
                                ],
                                "indentedName": "2012"
                            },
                            {
                                "name": "2012-2016 Swing",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "US Elections",
                                            "name": "US Election Data"
                                        },
                                        "column": 3
                                    }
                                ],
                                "indentedName": "2012-2016 Swing"
                            }
                        ]
                    },
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2016 Presidential Election",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "US Elections",
                                            "name": "US Election Data"
                                        },
                                        "column": 16
                                    }
                                ],
                                "indentedName": "2016"
                            },
                            {
                                "name": "2016-2020 Swing",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "US Elections",
                                            "name": "US Election Data"
                                        },
                                        "column": 17
                                    }
                                ],
                                "indentedName": "2016-2020 Swing"
                            },
                            {
                                "name": "2020 Presidential Election",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "US Elections",
                                            "name": "US Election Data"
                                        },
                                        "column": 32
                                    }
                                ],
                                "indentedName": "2020"
                            },
                            {
                                "name": "2020-2024 Swing",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "US Elections",
                                            "name": "US Election Data"
                                        },
                                        "column": 33
                                    }
                                ],
                                "indentedName": "2020-2024 Swing"
                            },
                            {
                                "name": "2024 Presidential Election",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "US Elections",
                                            "name": "US Election Data"
                                        },
                                        "column": 48
                                    }
                                ],
                                "indentedName": "2024"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "canada_general_election_coalition_margin",
                "name": "Canadian GE: 2-Coalition Margin",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2015GE 2-Coalition Margin",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 15
                                    }
                                ],
                                "indentedName": "2015"
                            },
                            {
                                "name": "2015-2019 Swing 2-Coalition Margin",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 9
                                    }
                                ],
                                "indentedName": "2015-2019 Swing"
                            },
                            {
                                "name": "2019GE 2-Coalition Margin",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 31
                                    }
                                ],
                                "indentedName": "2019"
                            },
                            {
                                "name": "2019-2021 Swing 2-Coalition Margin",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 24
                                    }
                                ],
                                "indentedName": "2019-2021 Swing"
                            },
                            {
                                "name": "2021GE 2-Coalition Margin",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 47
                                    }
                                ],
                                "indentedName": "2021"
                            },
                            {
                                "name": "2021-2025 Swing 2-Coalition Margin",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 40
                                    }
                                ],
                                "indentedName": "2021-2025 Swing"
                            },
                            {
                                "name": "2025GE 2-Coalition Margin",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 55
                                    }
                                ],
                                "indentedName": "2025"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "canada_general_election_lib",
                "name": "Canadian GE: Liberal",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2015GE Lib %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 13
                                    }
                                ],
                                "indentedName": "2015"
                            },
                            {
                                "name": "2015-2019 Swing Lib %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 7
                                    }
                                ],
                                "indentedName": "2015-2019 Swing"
                            },
                            {
                                "name": "2019GE Lib %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 28
                                    }
                                ],
                                "indentedName": "2019"
                            },
                            {
                                "name": "2019-2021 Swing Lib %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 21
                                    }
                                ],
                                "indentedName": "2019-2021 Swing"
                            },
                            {
                                "name": "2021GE Lib %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 44
                                    }
                                ],
                                "indentedName": "2021"
                            },
                            {
                                "name": "2021-2025 Swing Lib %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 37
                                    }
                                ],
                                "indentedName": "2021-2025 Swing"
                            },
                            {
                                "name": "2025GE Lib %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 52
                                    }
                                ],
                                "indentedName": "2025"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "canada_general_election_con",
                "name": "Canadian GE: Conservative",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2015GE Con %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 11
                                    }
                                ],
                                "indentedName": "2015"
                            },
                            {
                                "name": "2015-2019 Swing Con %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 5
                                    }
                                ],
                                "indentedName": "2015-2019 Swing"
                            },
                            {
                                "name": "2019GE Con %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 26
                                    }
                                ],
                                "indentedName": "2019"
                            },
                            {
                                "name": "2019-2021 Swing Con %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 19
                                    }
                                ],
                                "indentedName": "2019-2021 Swing"
                            },
                            {
                                "name": "2021GE Con %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 42
                                    }
                                ],
                                "indentedName": "2021"
                            },
                            {
                                "name": "2021-2025 Swing Con %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 35
                                    }
                                ],
                                "indentedName": "2021-2025 Swing"
                            },
                            {
                                "name": "2025GE Con %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 50
                                    }
                                ],
                                "indentedName": "2025"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "canada_general_election_ndp",
                "name": "Canadian GE: NDP",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2015GE NDP %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 14
                                    }
                                ],
                                "indentedName": "2015"
                            },
                            {
                                "name": "2015-2019 Swing NDP %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 8
                                    }
                                ],
                                "indentedName": "2015-2019 Swing"
                            },
                            {
                                "name": "2019GE NDP %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 29
                                    }
                                ],
                                "indentedName": "2019"
                            },
                            {
                                "name": "2019-2021 Swing NDP %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 22
                                    }
                                ],
                                "indentedName": "2019-2021 Swing"
                            },
                            {
                                "name": "2021GE NDP %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 45
                                    }
                                ],
                                "indentedName": "2021"
                            },
                            {
                                "name": "2021-2025 Swing NDP %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 38
                                    }
                                ],
                                "indentedName": "2021-2025 Swing"
                            },
                            {
                                "name": "2025GE NDP %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 53
                                    }
                                ],
                                "indentedName": "2025"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "canada_general_election_bq",
                "name": "Canadian GE: Bloc Qu\u00e9b\u00e9cois",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2015GE BQ %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 10
                                    }
                                ],
                                "indentedName": "2015"
                            },
                            {
                                "name": "2015-2019 Swing BQ %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 4
                                    }
                                ],
                                "indentedName": "2015-2019 Swing"
                            },
                            {
                                "name": "2019GE BQ %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 25
                                    }
                                ],
                                "indentedName": "2019"
                            },
                            {
                                "name": "2019-2021 Swing BQ %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 18
                                    }
                                ],
                                "indentedName": "2019-2021 Swing"
                            },
                            {
                                "name": "2021GE BQ %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 41
                                    }
                                ],
                                "indentedName": "2021"
                            },
                            {
                                "name": "2021-2025 Swing BQ %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 34
                                    }
                                ],
                                "indentedName": "2021-2025 Swing"
                            },
                            {
                                "name": "2025GE BQ %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 49
                                    }
                                ],
                                "indentedName": "2025"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "canada_general_election_grn",
                "name": "Canadian GE: Green",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2015GE Grn %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 12
                                    }
                                ],
                                "indentedName": "2015"
                            },
                            {
                                "name": "2015-2019 Swing Grn %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 6
                                    }
                                ],
                                "indentedName": "2015-2019 Swing"
                            },
                            {
                                "name": "2019GE Grn %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 27
                                    }
                                ],
                                "indentedName": "2019"
                            },
                            {
                                "name": "2019-2021 Swing Grn %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 20
                                    }
                                ],
                                "indentedName": "2019-2021 Swing"
                            },
                            {
                                "name": "2021GE Grn %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 43
                                    }
                                ],
                                "indentedName": "2021"
                            },
                            {
                                "name": "2021-2025 Swing Grn %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 36
                                    }
                                ],
                                "indentedName": "2021-2025 Swing"
                            },
                            {
                                "name": "2025GE Grn %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 51
                                    }
                                ],
                                "indentedName": "2025"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "canada_general_election_ppc",
                "name": "Canadian GE: PPC",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "2019GE PPC %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 30
                                    }
                                ],
                                "indentedName": "2019"
                            },
                            {
                                "name": "2019-2021 Swing PPC %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 23
                                    }
                                ],
                                "indentedName": "2019-2021 Swing"
                            },
                            {
                                "name": "2021GE PPC %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 46
                                    }
                                ],
                                "indentedName": "2021"
                            },
                            {
                                "name": "2021-2025 Swing PPC %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 39
                                    }
                                ],
                                "indentedName": "2021-2025 Swing"
                            },
                            {
                                "name": "2025GE PPC %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Canadian Elections",
                                            "name": "Elections Canada"
                                        },
                                        "column": 54
                                    }
                                ],
                                "indentedName": "2025"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "metadata_show_metadata_congressional_representatives",
                "name": "Congressional Representatives",
                "subcategory": null,
                "contents": [
                    {
                        "year": null,
                        "stats_by_source": [
                            {
                                "name": "Congressional Representatives",
                                "stats": [
                                    {
                                        "kind": "metadata",
                                        "source": {
                                            "category": "Metadata",
                                            "name": "Article Metadata"
                                        },
                                        "path": "metadata_show_metadata_representatives",
                                        "metadata_index": 5,
                                        "value_type": "string"
                                    }
                                ],
                                "indentedName": null
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "distance_from_features",
        "name": "Distance from Features",
        "contents": [
            {
                "id": "park_percent_1km_v2",
                "name": "PW Mean % of parkland within 1km",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Mean % of parkland within 1km",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Distance from Features",
                                            "name": "Feature Datasets"
                                        },
                                        "column": 396
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "within_Hospital_10",
                "name": "Within 10km of Hospital %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Within 10km of Hospital %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Distance from Features",
                                            "name": "Feature Datasets"
                                        },
                                        "column": 491
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_dist_Hospital_updated",
                "name": "Mean distance to nearest Hospital",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean distance to nearest Hospital",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Distance from Features",
                                            "name": "Feature Datasets"
                                        },
                                        "column": 334
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "within_Public School_2",
                "name": "Within 2km of Public School %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Within 2km of Public School %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Distance from Features",
                                            "name": "Feature Datasets"
                                        },
                                        "column": 492
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_dist_Public School_updated",
                "name": "Mean distance to nearest Public School",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean distance to nearest Public School",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Distance from Features",
                                            "name": "Feature Datasets"
                                        },
                                        "column": 335
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "within_Airport_30",
                "name": "Within 30km of Airport %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Within 30km of Airport %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Distance from Features",
                                            "name": "Feature Datasets"
                                        },
                                        "column": 490
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_dist_Airport_updated",
                "name": "Mean distance to nearest Airport",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean distance to nearest Airport",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Distance from Features",
                                            "name": "Feature Datasets"
                                        },
                                        "column": 333
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "within_Active Superfund Site_10",
                "name": "Within 10km of Active Superfund Site %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Within 10km of Active Superfund Site %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Distance from Features",
                                            "name": "Feature Datasets"
                                        },
                                        "column": 489
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_dist_Active Superfund Site_updated",
                "name": "Mean distance to nearest Active Superfund Site",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean distance to nearest Active Superfund Site",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Distance from Features",
                                            "name": "Feature Datasets"
                                        },
                                        "column": 332
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "lapophalfshare_usda_fra_1",
                "name": "Within 0.5mi of a grocery store %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Within 0.5mi of a grocery store %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Food Access",
                                            "name": "USDA Food Access Research Atlas"
                                        },
                                        "column": 322
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "lapop1share_usda_fra_1",
                "name": "Within 1mi of a grocery store %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Within 1mi of a grocery store %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Food Access",
                                            "name": "USDA Food Access Research Atlas"
                                        },
                                        "column": 320
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "lapop10share_usda_fra_1",
                "name": "Within 10mi of a grocery store %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Within 10mi of a grocery store %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Food Access",
                                            "name": "USDA Food Access Research Atlas"
                                        },
                                        "column": 319
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "lapop20share_usda_fra_1",
                "name": "Within 20mi of a grocery store %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Within 20mi of a grocery store %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Food Access",
                                            "name": "USDA Food Access Research Atlas"
                                        },
                                        "column": 321
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "weather",
        "name": "Weather",
        "contents": [
            {
                "id": "mean_high_temp_4",
                "name": "Mean high temp",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high temp",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 338
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_low_temp",
                "name": "Mean low temp",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean low temp",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 347
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_high_heat_index_4",
                "name": "Mean high heat index",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high heat index",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 337
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_high_dewpoint_4",
                "name": "Mean high dewpt",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high dewpt",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 336
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "days_above_90_4",
                "name": "High temperature Above 90\u00b0F %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "High temperature Above 90\u00b0F %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 151
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "days_between_40_and_90_4",
                "name": "High temperature Between 40 and 90\u00b0F %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "High temperature Between 40 and 90\u00b0F %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 153
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "days_below_40_4",
                "name": "High temperature Below 40\u00b0F %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "High temperature Below 40\u00b0F %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 152
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "days_dewpoint_70_inf_4",
                "name": "Humid days (dewpt > 70\u00b0F) %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Humid days (dewpt > 70\u00b0F) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 156
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "days_dewpoint_50_70_4",
                "name": "Non-humid, Non-dry days (50\u00b0F < dewpt < 70\u00b0F) %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Non-humid, Non-dry days (50\u00b0F < dewpt < 70\u00b0F) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 155
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "days_dewpoint_-inf_50_4",
                "name": "Dry days (dewpt < 50\u00b0F) %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Dry days (dewpt < 50\u00b0F) %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 154
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "hours_sunny_4",
                "name": "Mean sunny hours",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean sunny hours",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 245
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "rainfall_4",
                "name": "Rainfall",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Rainfall",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 408
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "snowfall_4",
                "name": "Snowfall [rain-equivalent]",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Snowfall [rain-equivalent]",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 445
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "wind_speed_over_10mph_4",
                "name": "High windspeed (>10mph) days %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "High windspeed (>10mph) days %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 488
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_high_temp_djf",
                "name": "Mean high temperature in Dec/Jan/Feb",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high temperature in Dec/Jan/Feb",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 339
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_high_temp_mam",
                "name": "Mean high temperature in Mar/Apr/May",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high temperature in Mar/Apr/May",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 342
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_high_temp_jja",
                "name": "Mean high temperature in Jun/Jul/Aug",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high temperature in Jun/Jul/Aug",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 341
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_high_temp_son",
                "name": "Mean high temperature in Sep/Oct/Nov",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high temperature in Sep/Oct/Nov",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 343
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_low_temp_djf",
                "name": "Mean low temperature in Dec/Jan/Feb",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean low temperature in Dec/Jan/Feb",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 348
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_low_temp_mam",
                "name": "Mean low temperature in Mar/Apr/May",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean low temperature in Mar/Apr/May",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 350
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_low_temp_jja",
                "name": "Mean low temperature in Jun/Jul/Aug",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean low temperature in Jun/Jul/Aug",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 349
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_low_temp_son",
                "name": "Mean low temperature in Sep/Oct/Nov",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean low temperature in Sep/Oct/Nov",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 351
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "misc",
        "name": "Miscellaneous",
        "contents": [
            {
                "id": "internet_no_access",
                "name": "No internet access %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "No internet access %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 311
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "insurance_coverage_none",
                "name": "Uninsured %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Uninsured %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 309
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "insurance_coverage_govt",
                "name": "Public Insurance %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Public Insurance %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 308
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "insurance_coverage_private",
                "name": "Private Insurance %",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Private Insurance %",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 310
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "geoid",
        "name": "Geographic Identifiers",
        "contents": [
            {
                "id": "metadata_show_metadata_fips",
                "name": "FIPS",
                "subcategory": null,
                "contents": [
                    {
                        "year": null,
                        "stats_by_source": [
                            {
                                "name": "FIPS",
                                "stats": [
                                    {
                                        "kind": "metadata",
                                        "source": {
                                            "category": "Metadata",
                                            "name": "Article Metadata"
                                        },
                                        "path": "metadata_show_metadata_fips",
                                        "metadata_index": 0,
                                        "value_type": "string"
                                    }
                                ],
                                "indentedName": null
                            }
                        ]
                    }
                ]
            },
            {
                "id": "metadata_show_metadata_statcan_geocode",
                "name": "StatCan GeoCode",
                "subcategory": null,
                "contents": [
                    {
                        "year": null,
                        "stats_by_source": [
                            {
                                "name": "StatCan GeoCode",
                                "stats": [
                                    {
                                        "kind": "metadata",
                                        "source": {
                                            "category": "Metadata",
                                            "name": "Article Metadata"
                                        },
                                        "path": "metadata_show_metadata_statcan_geocode",
                                        "metadata_index": 1,
                                        "value_type": "string"
                                    }
                                ],
                                "indentedName": null
                            }
                        ]
                    }
                ]
            },
            {
                "id": "metadata_show_metadata_iso_code",
                "name": "ISO Code",
                "subcategory": null,
                "contents": [
                    {
                        "year": null,
                        "stats_by_source": [
                            {
                                "name": "ISO Code",
                                "stats": [
                                    {
                                        "kind": "metadata",
                                        "source": {
                                            "category": "Metadata",
                                            "name": "Article Metadata"
                                        },
                                        "path": "metadata_show_metadata_iso_code",
                                        "metadata_index": 4,
                                        "value_type": "string"
                                    }
                                ],
                                "indentedName": null
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "other_densities",
        "name": "Other Density Metrics",
        "contents": [
            {
                "id": "ad_0.25",
                "name": "PW Density (r=250m)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=250m)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 82
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 167
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=250m) (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 84
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 157
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "PW Density (r=250m) Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 86
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 177
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=250m) (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 83
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "PW Density (r=250m) Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 85
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "ad_0.5",
                "name": "PW Density (r=500m)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=500m)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 87
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 168
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=500m) (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 89
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 158
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "PW Density (r=500m) Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 91
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 178
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=500m) (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 88
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "PW Density (r=500m) Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 90
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "ad_1.609344",
                "name": "PW Density (r=1mi)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=1mi)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 93
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 169
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "GHSL"
                                        },
                                        "column": 217
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=1mi) (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 95
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 159
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "PW Density (r=1mi) Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 97
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 179
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=1mi) (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 94
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "PW Density (r=1mi) Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 96
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "ad_2",
                "name": "PW Density (r=2km)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=2km)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 107
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 172
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "GHSL"
                                        },
                                        "column": 219
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=2km) (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 109
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 162
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "PW Density (r=2km) Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 111
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 182
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=2km) (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 108
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "PW Density (r=2km) Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 110
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "ad_4",
                "name": "PW Density (r=4km)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=4km)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 117
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 174
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "GHSL"
                                        },
                                        "column": 221
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=4km) (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 119
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 164
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "PW Density (r=4km) Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 121
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 184
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=4km) (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 118
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "PW Density (r=4km) Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 120
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "ad_8",
                "name": "PW Density (r=8km)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=8km)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 127
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 176
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "GHSL"
                                        },
                                        "column": 223
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=8km) (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 129
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 166
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "PW Density (r=8km) Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 131
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 186
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=8km) (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 128
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "PW Density (r=8km) Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 130
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "ad_16",
                "name": "PW Density (r=16km)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=16km)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 98
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 170
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "GHSL"
                                        },
                                        "column": 218
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=16km) (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 100
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 160
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "PW Density (r=16km) Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 102
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 180
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=16km) (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 99
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "PW Density (r=16km) Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 101
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "ad_32",
                "name": "PW Density (r=32km)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=32km)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 112
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 173
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "GHSL"
                                        },
                                        "column": 220
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=32km) (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 114
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 163
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "PW Density (r=32km) Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 116
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 183
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=32km) (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 113
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "PW Density (r=32km) Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 115
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "ad_64",
                "name": "PW Density (r=64km)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=64km)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 122
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 175
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "GHSL"
                                        },
                                        "column": 222
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    },
                    {
                        "year": 2010,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=64km) (2010)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 124
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 165
                                    }
                                ],
                                "indentedName": "2010"
                            },
                            {
                                "name": "PW Density (r=64km) Change (2010-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 126
                                    },
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "Canadian Census"
                                        },
                                        "column": 185
                                    }
                                ],
                                "indentedName": "2010-2020 Change"
                            }
                        ]
                    },
                    {
                        "year": 2000,
                        "stats_by_source": [
                            {
                                "name": "PW Density (r=64km) (2000)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 123
                                    }
                                ],
                                "indentedName": "2000"
                            },
                            {
                                "name": "PW Density (r=64km) Change (2000-2020)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 125
                                    }
                                ],
                                "indentedName": "2000-2020 Change"
                            }
                        ]
                    }
                ]
            }
        ]
    },
    {
        "id": "deprecated",
        "name": "Deprecated",
        "contents": [
            {
                "id": "mean_high_temp_summer_4",
                "name": "Mean high temperature in summer",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high temperature in summer",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 345
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_high_temp_winter_4",
                "name": "Mean high temperature in winter",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high temperature in winter",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 346
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_high_temp_fall_4",
                "name": "Mean high temperature in fall",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high temperature in fall",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 340
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "mean_high_temp_spring_4",
                "name": "Mean high temperature in spring",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Mean high temperature in spring",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Weather",
                                            "name": "ERA5"
                                        },
                                        "column": 344
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_means_car",
                "name": "Commute Car % (incl WFH)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Car % (incl WFH)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 468
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_means_bike",
                "name": "Commute Bike % (incl WFH)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Bike % (incl WFH)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 465
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_means_walk",
                "name": "Commute Walk % (incl WFH)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Walk % (incl WFH)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 474
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_means_transit",
                "name": "Commute Transit % (incl WFH)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Transit % (incl WFH)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 471
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            },
            {
                "id": "transportation_means_worked_at_home",
                "name": "Commute Work From Home % (incl WFH)",
                "subcategory": null,
                "contents": [
                    {
                        "year": 2020,
                        "stats_by_source": [
                            {
                                "name": "Commute Work From Home % (incl WFH)",
                                "stats": [
                                    {
                                        "kind": "data",
                                        "source": {
                                            "category": "Population",
                                            "name": "US Census"
                                        },
                                        "column": 477
                                    }
                                ],
                                "indentedName": "2020"
                            }
                        ]
                    }
                ]
            }
        ]
    }
] as const
