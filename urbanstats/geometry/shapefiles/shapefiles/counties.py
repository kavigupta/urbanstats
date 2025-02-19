import us

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def county_name(row):
    f = row["NAMELSAD"]
    if f.lower().endswith("city"):
        f = f + "-County"
    return f


def compute_geoid(row):
    return row.STATEFP + row.COUNTYFP


COUNTIES = Shapefile(
    hash_key="census_counties_7",
    path="named_region_shapefiles/cb_2022_us_county_500k.zip",
    shortname_extractor=county_name,
    longname_extractor=lambda x: county_name(x)
    + ", "
    + us.states.lookup(x["STATEFP"]).name
    + ", USA",
    additional_columns_computer={"geoid": compute_geoid},
    filter=lambda x: True,
    meta=dict(type="County", source="Census", type_category="US Subdivision"),
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="CNTY",
)
