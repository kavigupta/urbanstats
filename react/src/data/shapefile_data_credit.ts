const value: { name: string, dataCredit: { text: string | null, linkText: string, link: string }[] }[] = [
    {
        name: 'County',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html',
            },
        ],
    },
    {
        name: 'MSA',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
        ],
    },
    {
        name: 'CSA',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
        ],
    },
    {
        name: 'Urban Area',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
        ],
    },
    {
        name: 'ZIP',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
        ],
    },
    {
        name: 'CCD',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html',
            },
        ],
    },
    {
        name: 'City',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html',
            },
        ],
    },
    {
        name: 'Neighborhood',
        dataCredit: [
            {
                text: null,
                linkText: 'Zillow',
                link: 'https://catalog.data.gov/dataset/neighborhoods-us-2017-zillow-segs',
            },
        ],
    },
    {
        name: 'Congressional District',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www2.census.gov/geo/tiger/TIGER_RD18/LAYER/CD',
            },
        ],
    },
    {
        name: 'State House District',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www2.census.gov/geo/tiger/TIGER2018/SLDL/',
            },
        ],
    },
    {
        name: 'State Senate District',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www2.census.gov/geo/tiger/TIGER2018/SLDU/',
            },
        ],
    },
    {
        name: 'Historical Congressional District',
        dataCredit: [
            {
                text: 'We adapt Jeffrey B. Lewis, Brandon DeVine, and Lincoln Pritcher with Kenneth C. Martis to unclip the coastlines.',
                linkText: 'Explanation of unclipping, and changes',
                link: 'https://github.com/kavigupta/historical-congressional-unclipped',
            },
        ],
    },
    {
        name: 'Native Area',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
        ],
    },
    {
        name: 'Native Statistical Area',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
        ],
    },
    {
        name: 'Native Subdivision',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
        ],
    },
    {
        name: 'School District',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
        ],
    },
    {
        name: 'Judicial District',
        dataCredit: [
            {
                text: null,
                linkText: 'Homeland Infrastructure Foundation-Level Data (HIFLD)',
                link: 'https://hifld-geoplatform.opendata.arcgis.com/datasets/geoplatform::us-district-court-jurisdictions/explore?location=31.251558%2C-88.409995%2C4.92&showTable=true',
            },
        ],
    },
    {
        name: 'Judicial Circuit',
        dataCredit: [
            {
                text: null,
                linkText: 'Homeland Infrastructure Foundation-Level Data (HIFLD)',
                link: 'https://hifld-geoplatform.opendata.arcgis.com/datasets/geoplatform::us-district-court-jurisdictions/explore?location=31.251558%2C-88.409995%2C4.92&showTable=true',
            },
        ],
    },
    {
        name: 'County Cross CD',
        dataCredit: [
            {
                text: 'We take the intersection of the county and congressional district shapefiles.',
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html',
            },
        ],
    },
    {
        name: 'USDA County Type',
        dataCredit: [
            {
                text: null,
                linkText: 'USDA',
                link: 'https://www.ers.usda.gov/data-products/county-typology-codes/',
            },
        ],
    },
    {
        name: 'Hospital Referral Region',
        dataCredit: [
            {
                text: null,
                linkText: 'the Dartmouth Atlas (minor errors fixed by us)',
                link: 'https://data.dartmouthatlas.org/supplemental/#boundaries',
            },
        ],
    },
    {
        name: 'Hospital Service Area',
        dataCredit: [
            {
                text: null,
                linkText: 'the Dartmouth Atlas (minor errors fixed by us)',
                link: 'https://data.dartmouthatlas.org/supplemental/#boundaries',
            },
        ],
    },
    {
        name: 'Media Market',
        dataCredit: [
            {
                text: null,
                linkText: 'Kenneth C Black',
                link: 'https://datablends.us/2021/01/14/a-useful-dma-shapefile-for-tableau-and-alteryx/',
            },
        ],
    },
    {
        name: 'CA Census Division',
        dataCredit: [
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcd_000b21a_e.zip',
            },
        ],
    },
    {
        name: 'CA Census Subdivision',
        dataCredit: [
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcsd000a21a_e.zip',
            },
        ],
    },
    {
        name: 'CA Population Center',
        dataCredit: [
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lpc_000a21a_e.zip',
            },
        ],
    },
    {
        name: 'CA CMA',
        dataCredit: [
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcma000a21a_e.zip',
            },
        ],
    },
    {
        name: 'CA Riding',
        dataCredit: [
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lfed000a21a_e.zip',
            },
        ],
    },
    {
        name: 'Continent',
        dataCredit: [
            {
                text: 'Aggregated from subnational regions',
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
            {
                text: 'Aggregated from subnational regions',
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lpr_000a21a_e.zip',
            },
            {
                text: 'Aggregated from subnational regions',
                linkText: 'ESRI',
                link: 'https://hub.arcgis.com/datasets/esri::world-administrative-divisions/explore?location=41.502196%2C25.823236%2C6.69',
            },
        ],
    },
    {
        name: 'Country',
        dataCredit: [
            {
                text: 'Aggregated from subnational regions',
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
            {
                text: 'Aggregated from subnational regions',
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lpr_000a21a_e.zip',
            },
            {
                text: 'Aggregated from subnational regions',
                linkText: 'ESRI',
                link: 'https://hub.arcgis.com/datasets/esri::world-administrative-divisions/explore?location=41.502196%2C25.823236%2C6.69',
            },
        ],
    },
    {
        name: 'Subnational Region',
        dataCredit: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lpr_000a21a_e.zip',
            },
            {
                text: null,
                linkText: 'ESRI',
                link: 'https://hub.arcgis.com/datasets/esri::world-administrative-divisions/explore?location=41.502196%2C25.823236%2C6.69',
            },
        ],
    },
    {
        name: 'Urban Center',
        dataCredit: [
            {
                text: 'We filtered this dataset for urban centers with a quality code (QA2_1V) of 1, indicating a true positive, and which are named.',
                linkText: 'GHSL',
                link: 'https://human-settlement.emergency.copernicus.eu/ghs_stat_ucdb2015mt_r2019a.php',
            },
        ],
    },
    {
        name: '5M Person Circle',
        dataCredit: [
            {
                text: 'The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded for the purpose of this website',
                linkText: 'Detailed maps and JSON files',
                link: 'https://github.com/kavigupta/urbanstats/tree/master/outputs/population_circles',
            },
        ],
    },
    {
        name: '10M Person Circle',
        dataCredit: [
            {
                text: 'The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded for the purpose of this website',
                linkText: 'Detailed maps and JSON files',
                link: 'https://github.com/kavigupta/urbanstats/tree/master/outputs/population_circles',
            },
        ],
    },
    {
        name: '20M Person Circle',
        dataCredit: [
            {
                text: 'The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded for the purpose of this website',
                linkText: 'Detailed maps and JSON files',
                link: 'https://github.com/kavigupta/urbanstats/tree/master/outputs/population_circles',
            },
        ],
    },
    {
        name: '50M Person Circle',
        dataCredit: [
            {
                text: 'The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded for the purpose of this website',
                linkText: 'Detailed maps and JSON files',
                link: 'https://github.com/kavigupta/urbanstats/tree/master/outputs/population_circles',
            },
        ],
    },
    {
        name: '100M Person Circle',
        dataCredit: [
            {
                text: 'The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded for the purpose of this website',
                linkText: 'Detailed maps and JSON files',
                link: 'https://github.com/kavigupta/urbanstats/tree/master/outputs/population_circles',
            },
        ],
    },
    {
        name: '200M Person Circle',
        dataCredit: [
            {
                text: 'The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded for the purpose of this website',
                linkText: 'Detailed maps and JSON files',
                link: 'https://github.com/kavigupta/urbanstats/tree/master/outputs/population_circles',
            },
        ],
    },
    {
        name: '500M Person Circle',
        dataCredit: [
            {
                text: 'The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded for the purpose of this website',
                linkText: 'Detailed maps and JSON files',
                link: 'https://github.com/kavigupta/urbanstats/tree/master/outputs/population_circles',
            },
        ],
    },
    {
        name: '1B Person Circle',
        dataCredit: [
            {
                text: 'The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded for the purpose of this website',
                linkText: 'Detailed maps and JSON files',
                link: 'https://github.com/kavigupta/urbanstats/tree/master/outputs/population_circles',
            },
        ],
    },
]
export default value
