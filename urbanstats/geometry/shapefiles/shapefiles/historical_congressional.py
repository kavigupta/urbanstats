from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def to_year(congress_number):
    congress_number_zero_indexed = congress_number - 1
    year_congress_start = 1789  # 1st Congress started in 1789
    return congress_number_zero_indexed * 2 + year_congress_start


def historical_shortname(x):
    return f'{x["state"]}-{int(x["district"]):02d} ({to_year(x.start)})'


HISTORICAL_CONGRESSIONAL = Shapefile(
    hash_key="historical_congressional_5",
    path="named_region_shapefiles/congressional_districts/combo/historical.pkl",
    shortname_extractor=historical_shortname,
    longname_extractor=lambda x: historical_shortname(x) + ", USA",
    filter=lambda x: True,
    meta=dict(
        type="Historical Congressional District",
        source="Census",
        type_category="Political",
    ),
    chunk_size=100,
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
)
