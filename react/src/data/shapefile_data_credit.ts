const value: {names: string[], dataCredits: {text: string | null, linkText: string, link: string}[]}[] = [
    {
        "names": [
            "Continent",
            "Country",
            "Subnational Region"
        ],
        "dataCredits": [
            {
                "text": "Countries and continents are created by merging subnational regions.",
                "linkText": "ESRI",
                "link": "https://hub.arcgis.com/datasets/esri::world-administrative-divisions/explore?location=41.502196%2C25.823236%2C6.69"
            },
            {
                "text": null,
                "linkText": "US Census",
                "link": "https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html"
            },
            {
                "text": null,
                "linkText": "Canadian Census",
                "link": "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lpr_000a21a_e.zip"
            }
        ]
    },
    {
        "names": [
            "County",
            "City",
            "CCD"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "US Census",
                "link": "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html"
            }
        ]
    },
    {
        "names": [
            "Urban Center"
        ],
        "dataCredits": [
            {
                "text": "We filtered this dataset for urban centers with a quality code (QA2_1V) of 1, indicating a true positive, and which are named.",
                "linkText": "GHSL",
                "link": "https://human-settlement.emergency.copernicus.eu/ghs_stat_ucdb2015mt_r2019a.php"
            }
        ]
    },
    {
        "names": [
            "Metropolitan Cluster"
        ],
        "dataCredits": [
            {
                "text": "\n        Taylor computed metropolitan clusters as follows:\n        <ol>\n        <li>\n            A cell (3&quot;x3&quot; area in the GHS-POP grid) is initially designated as urban if it has:\n            <ul>\n            <li>at least 20% built area, or</li>\n            <li>at least 10% built area, and at least 1000/km<sup>2</sup> population density.</li>\n            </ul>\n            Each diagonal-contiguous set of urban cells forms an urban sector.\n        </li>\n        <li>\n            We then merge sectors into clusters in multiple stages:\n            <ul>\n            <li>sectors of any size with gaps under 300m are merged.</li>\n            <li>sectors of at least 10000 population and with gaps under 1 km are merged.</li>\n            <li>sectors of population A, B and with a gap under (min(pop(A), 50000) + min(pop(B), 50000))/20000 km are merged, if the gap contains no cells that have nonzero population or built surface that are not directly adjacent to the two sectors.</li>\n            <li>sectors of under 10000 population at this stage are excluded; the remaining sectors are combined with the cells within 150m of their boundaries, and any now-overlapping sectors are merged.</li>\n            <li>any holes in the sectors are filled, forming clusters.</li>\n        </li>\n        <li>\n            A cluster is metropolitan if it has a population of at least 50000 and contains a core, and micropolitan otherwise. A core is a diagonal-contiguous set of cells which are either:\n            <ul>\n            <li>all at least 10% built area and at least 2500/km<sup>2</sup> population density, with a total population of 5000, or</li>\n            <li>all at least 5000/km<sup>2</sup> population density, with a total population of 1000.</li>\n            </ul>\n        </li>\n        </ol>\n        <p>\n        for efficiency, distances are computed taxicab on a diagonal grid; the overall effect of this is probably negligible.\n        </p>\n        <p>\n        Clusters with an area of less than 0.5 km<sup>2</sup> are excluded.\n        </p>\n\n        <p>\n        Names are assigned from datasets OSM, GeoNames cities, and Wikidata. In each case,\n        a name is assigned to a cluster if either it is within the cluster, or the cluster is\n        uniquely within a square of either 1&apos; by 1&apos; or 5&apos; by 5&apos; centered on the name.\n        </p>\n\n        <p>\n        For each of these 3 datasets, we first see if any names are assigned to the cluster. If so,\n        we prune all names with population less than half the largest, deduplicate the names for\n        ones that are similar, and then prune to at most 3 names, then hyphenate the names together.\n        If not, we move to the following dataset and repeat the process.\n        </p>\n\n        <p>\n        if no names are assigned, the cluster is named after its centroid coordinates,\n        with a parenthetical containing other geonames that map to the cluster. These\n        parenthetical names should not be treated as official names.\n        </p>\n        ",
                "linkText": "Taylor (Elpis)",
                "link": "https://bsky.app/profile/elpis.bsky.social"
            }
        ]
    },
    {
        "names": [
            "CA Census Division"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "Canadian Census",
                "link": "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcd_000b21a_e.zip"
            }
        ]
    },
    {
        "names": [
            "CA Population Center"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "Canadian Census",
                "link": "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lpc_000a21a_e.zip"
            }
        ]
    },
    {
        "names": [
            "CSA",
            "MSA",
            "Urban Area",
            "ZIP",
            "Native Area",
            "Native Statistical Area",
            "Native Subdivision",
            "School District"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "US Census",
                "link": "https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html"
            }
        ]
    },
    {
        "names": [
            "CA CMA"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "Canadian Census",
                "link": "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcma000a21a_e.zip"
            }
        ]
    },
    {
        "names": [
            "CA Census Subdivision"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "Canadian Census",
                "link": "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcsd000a21a_e.zip"
            }
        ]
    },
    {
        "names": [
            "Neighborhood"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "Zillow",
                "link": "https://catalog.data.gov/dataset/neighborhoods-us-2017-zillow-segs"
            }
        ]
    },
    {
        "names": [
            "Congressional District (1780s)",
            "Congressional District (1790s)",
            "Congressional District (1800s)",
            "Congressional District (1810s)",
            "Congressional District (1820s)",
            "Congressional District (1830s)",
            "Congressional District (1840s)",
            "Congressional District (1850s)",
            "Congressional District (1860s)",
            "Congressional District (1870s)",
            "Congressional District (1880s)",
            "Congressional District (1890s)",
            "Congressional District (1900s)",
            "Congressional District (1910s)",
            "Congressional District (1920s)",
            "Congressional District (1930s)",
            "Congressional District (1940s)",
            "Congressional District (1950s)",
            "Congressional District (1960s)",
            "Congressional District (1970s)",
            "Congressional District (1980s)",
            "Congressional District (1990s)",
            "Congressional District (2000s)",
            "Congressional District (2010s)"
        ],
        "dataCredits": [
            {
                "text": "We adapt Jeffrey B. Lewis, Brandon DeVine, and Lincoln Pritcher with Kenneth C. Martis to unclip the coastlines.",
                "linkText": "Explanation of unclipping, and changes",
                "link": "https://github.com/kavigupta/historical-congressional-unclipped"
            }
        ]
    },
    {
        "names": [
            "Congressional District (2020s)"
        ],
        "dataCredits": [
            {
                "text": "2020s data is from the US Census Bureau.",
                "linkText": "US Census",
                "link": "https://www2.census.gov/geo/tiger/TIGER2020/CD/"
            }
        ]
    },
    {
        "names": [
            "State House District"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "US Census",
                "link": "https://www2.census.gov/geo/tiger/TIGER2018/SLDL/"
            },
            {
                "text": "Under \"House Districts- As passed Dec. 5, 2023- House Committee Chair- House Bill 1EX\".",
                "linkText": "GA redistricting: GA Legislature",
                "link": "https://www.legis.ga.gov/joint-office/reapportionment"
            },
            {
                "text": null,
                "linkText": "MI redistricting: MI CRC",
                "link": "https://www.michigan.gov/micrc/mapping-process-2024/final-remedial-state-house-plan"
            },
            {
                "text": null,
                "linkText": "MT redistricting: MT Legislature",
                "link": "https://mtredistricting.gov/state-legislative-maps-proposed-by-the-commission"
            },
            {
                "text": "Using \"Current District Plans (used for 2022 election).\"",
                "linkText": "NC redistricting: NC Legislature",
                "link": "https://www.ncleg.gov/redistricting"
            },
            {
                "text": "Shapefiles are not directly linked, but can be found by searching for the specific state.",
                "linkText": "ND redistricting: DRA",
                "link": "https://davesredistricting.org/"
            },
            {
                "text": null,
                "linkText": "OH redistricting: OH Secretary of State",
                "link": "https://www.ohiosos.gov/elections/ohio-candidates/district-maps/"
            },
            {
                "text": "Shapefiles are not directly linked, but can be found by searching for the specific state.",
                "linkText": "SC redistricting: DRA",
                "link": "https://davesredistricting.org/"
            },
            {
                "text": null,
                "linkText": "WA redistricting: WA Government",
                "link": "https://geo.wa.gov/datasets/wa-ofm::washington-state-legislative-districts-2024/explore?location=46.911788%2C-120.933109%2C7.59"
            },
            {
                "text": "Shapefiles are not directly linked, but can be found by searching for the specific state.",
                "linkText": "WI redistricting: DRA",
                "link": "https://davesredistricting.org/"
            }
        ]
    },
    {
        "names": [
            "State Senate District"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "US Census",
                "link": "https://www2.census.gov/geo/tiger/TIGER2018/SLDU/"
            },
            {
                "text": "Under \"House Districts- As passed Dec. 5, 2023- House Committee Chair- House Bill 1EX\".",
                "linkText": "GA redistricting: GA Legislature",
                "link": "https://www.legis.ga.gov/joint-office/reapportionment"
            },
            {
                "text": null,
                "linkText": "MI redistricting: MI CRC",
                "link": "https://www.michigan.gov/micrc/mapping-process-2024/final-remedial-state-senate-plan"
            },
            {
                "text": null,
                "linkText": "MT redistricting: MT Legislature",
                "link": "https://mtredistricting.gov/state-legislative-maps-proposed-by-the-commission"
            },
            {
                "text": "Using \"Current District Plans (used for 2022 election).\"",
                "linkText": "NC redistricting: NC Legislature",
                "link": "https://www.ncleg.gov/redistricting"
            },
            {
                "text": "Shapefiles are not directly linked, but can be found by searching for the specific state.",
                "linkText": "ND redistricting: DRA",
                "link": "https://davesredistricting.org/"
            },
            {
                "text": null,
                "linkText": "OH redistricting: OH Secretary of State",
                "link": "https://www.ohiosos.gov/elections/ohio-candidates/district-maps/"
            },
            {
                "text": null,
                "linkText": "WA redistricting: WA Government",
                "link": "https://geo.wa.gov/datasets/wa-ofm::washington-state-legislative-districts-2024/explore?location=46.911788%2C-120.933109%2C7.59"
            },
            {
                "text": "Shapefiles are not directly linked, but can be found by searching for the specific state.",
                "linkText": "WI redistricting: DRA",
                "link": "https://davesredistricting.org/"
            }
        ]
    },
    {
        "names": [
            "Congressional District"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "US Census",
                "link": "https://www2.census.gov/geo/tiger/TIGER_RD18/LAYER/CD"
            },
            {
                "text": "Under \"Shape files\" under \"Court ordered Congressional Districts\".",
                "linkText": "AL redistricting: AL Secretary of State",
                "link": "https://www.sos.alabama.gov/alabama-votes/state-district-maps"
            },
            {
                "text": "Under \"House Districts- As passed Dec. 5, 2023- House Committee Chair- House Bill 1EX\".",
                "linkText": "GA redistricting: GA Legislature",
                "link": "https://www.legis.ga.gov/joint-office/reapportionment"
            },
            {
                "text": "Under \"Enacted Plans From the 2024 1st Extraordinary Session\"",
                "linkText": "LA redistricting: LA Legislature",
                "link": "https://redist.legis.la.gov/"
            },
            {
                "text": "Using \"Current District Plans (used for 2022 election).\"",
                "linkText": "NC redistricting: NC Legislature",
                "link": "https://www.ncleg.gov/redistricting"
            },
            {
                "text": "Shapefiles are not directly linked, but can be found by searching for the specific state.",
                "linkText": "NY redistricting: DRA",
                "link": "https://davesredistricting.org/"
            }
        ]
    },
    {
        "names": [
            "County Cross CD"
        ],
        "dataCredits": [
            {
                "text": "We take the intersection of the county and congressional district shapefiles.",
                "linkText": "US Census",
                "link": "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html"
            }
        ]
    },
    {
        "names": [
            "CA Riding"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "Canadian Census",
                "link": "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lfed000a21a_e.zip"
            }
        ]
    },
    {
        "names": [
            "Judicial Circuit",
            "Judicial District"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "Homeland Infrastructure Foundation-Level Data (HIFLD)",
                "link": "https://hifld-geoplatform.opendata.arcgis.com/datasets/geoplatform::us-district-court-jurisdictions/explore?location=31.251558%2C-88.409995%2C4.92&showTable=true"
            }
        ]
    },
    {
        "names": [
            "Media Market"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "Kenneth C Black",
                "link": "https://datablends.us/2021/01/14/a-useful-dma-shapefile-for-tableau-and-alteryx/"
            }
        ]
    },
    {
        "names": [
            "USDA County Type"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "USDA",
                "link": "https://www.ers.usda.gov/data-products/county-typology-codes/"
            }
        ]
    },
    {
        "names": [
            "Hospital Referral Region",
            "Hospital Service Area"
        ],
        "dataCredits": [
            {
                "text": null,
                "linkText": "the Dartmouth Atlas (minor errors fixed by us)",
                "link": "https://data.dartmouthatlas.org/supplemental/#boundaries"
            }
        ]
    },
    {
        "names": [
            "1B Person Circle",
            "500M Person Circle",
            "200M Person Circle",
            "100M Person Circle",
            "50M Person Circle",
            "20M Person Circle",
            "10M Person Circle",
            "5M Person Circle"
        ],
        "dataCredits": [
            {
                "text": "The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded for the purpose of this website",
                "linkText": "Detailed maps and JSON files",
                "link": "https://github.com/kavigupta/urbanstats/tree/main/outputs/population_circles"
            }
        ]
    }
]
export default value