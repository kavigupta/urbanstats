const value: { names: string[], dataCredits: { text: string | null, linkText: string, link: string }[] }[] = [
    {
        names: [
            'Continent',
            'Country',
        ],
        dataCredits: [
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
        names: [
            'Subnational Region',
        ],
        dataCredits: [
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
        names: [
            'County',
            'City',
            'CCD',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html',
            },
        ],
    },
    {
        names: [
            'Urban Center',
        ],
        dataCredits: [
            {
                text: 'We filtered this dataset for urban centers with a quality code (QA2_1V) of 1, indicating a true positive, and which are named.',
                linkText: 'GHSL',
                link: 'https://human-settlement.emergency.copernicus.eu/ghs_stat_ucdb2015mt_r2019a.php',
            },
        ],
    },
    {
        names: [
            'CA Census Division',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcd_000b21a_e.zip',
            },
        ],
    },
    {
        names: [
            'CA Population Center',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lpc_000a21a_e.zip',
            },
        ],
    },
    {
        names: [
            'CSA',
            'MSA',
            'Urban Area',
            'ZIP',
            'Native Area',
            'Native Statistical Area',
            'Native Subdivision',
            'School District',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html',
            },
        ],
    },
    {
        names: [
            'CA CMA',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcma000a21a_e.zip',
            },
        ],
    },
    {
        names: [
            'CA Census Subdivision',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lcsd000a21a_e.zip',
            },
        ],
    },
    {
        names: [
            'Neighborhood',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'Zillow',
                link: 'https://catalog.data.gov/dataset/neighborhoods-us-2017-zillow-segs',
            },
        ],
    },
    {
        names: [
            'Congressional District (1780s)',
            'Congressional District (1790s)',
            'Congressional District (1800s)',
            'Congressional District (1810s)',
            'Congressional District (1820s)',
            'Congressional District (1830s)',
            'Congressional District (1840s)',
            'Congressional District (1850s)',
            'Congressional District (1860s)',
            'Congressional District (1870s)',
            'Congressional District (1880s)',
            'Congressional District (1890s)',
            'Congressional District (1900s)',
            'Congressional District (1910s)',
            'Congressional District (1920s)',
            'Congressional District (1930s)',
            'Congressional District (1940s)',
            'Congressional District (1950s)',
            'Congressional District (1960s)',
            'Congressional District (1970s)',
            'Congressional District (1980s)',
            'Congressional District (1990s)',
            'Congressional District (2000s)',
            'Congressional District (2010s)',
            'Congressional District (2020s)',
        ],
        dataCredits: [
            {
                text: 'We adapt Jeffrey B. Lewis, Brandon DeVine, and Lincoln Pritcher with Kenneth C. Martis to unclip the coastlines.',
                linkText: 'Explanation of unclipping, and changes',
                link: 'https://github.com/kavigupta/historical-congressional-unclipped',
            },
        ],
    },
    {
        names: [
            'State House District',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www2.census.gov/geo/tiger/TIGER2018/SLDL/',
            },
        ],
    },
    {
        names: [
            'State Senate District',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www2.census.gov/geo/tiger/TIGER2018/SLDU/',
            },
        ],
    },
    {
        names: [
            'Congressional District',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'US Census',
                link: 'https://www2.census.gov/geo/tiger/TIGER_RD18/LAYER/CD',
            },
        ],
    },
    {
        names: [
            'County Cross CD',
        ],
        dataCredits: [
            {
                text: 'We take the intersection of the county and congressional district shapefiles.',
                linkText: 'US Census',
                link: 'https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html',
            },
        ],
    },
    {
        names: [
            'CA Riding',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'Canadian Census',
                link: 'https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/files-fichiers/lfed000a21a_e.zip',
            },
        ],
    },
    {
        names: [
            'Judicial Circuit',
            'Judicial District',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'Homeland Infrastructure Foundation-Level Data (HIFLD)',
                link: 'https://hifld-geoplatform.opendata.arcgis.com/datasets/geoplatform::us-district-court-jurisdictions/explore?location=31.251558%2C-88.409995%2C4.92&showTable=true',
            },
        ],
    },
    {
        names: [
            'Media Market',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'Kenneth C Black',
                link: 'https://datablends.us/2021/01/14/a-useful-dma-shapefile-for-tableau-and-alteryx/',
            },
        ],
    },
    {
        names: [
            'USDA County Type',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'USDA',
                link: 'https://www.ers.usda.gov/data-products/county-typology-codes/',
            },
        ],
    },
    {
        names: [
            'Hospital Referral Region',
            'Hospital Service Area',
        ],
        dataCredits: [
            {
                text: null,
                linkText: 'the Dartmouth Atlas (minor errors fixed by us)',
                link: 'https://data.dartmouthatlas.org/supplemental/#boundaries',
            },
        ],
    },
    {
        names: [
            '1B Person Circle',
            '500M Person Circle',
            '200M Person Circle',
            '100M Person Circle',
            '50M Person Circle',
            '20M Person Circle',
            '10M Person Circle',
            '5M Person Circle',
        ],
        dataCredits: [
            {
                text: 'The population circles were defined using the GHS-POP dataset, using an algorithm hand-coded for the purpose of this website',
                linkText: 'Detailed maps and JSON files',
                link: 'https://github.com/kavigupta/urbanstats/tree/master/outputs/population_circles',
            },
        ],
    },
]
export default value
