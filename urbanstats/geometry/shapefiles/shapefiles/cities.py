import us

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider

CITIES = Shapefile(
    hash_key="census_places_6",
    path="named_region_shapefiles/cb_2022_us_place_500k.zip",
    shortname_extractor=lambda x: x.NAMELSAD,
    longname_extractor=lambda x: f"{x.NAMELSAD}, {us.states.lookup(x.STATEFP).name}, USA",
    filter=lambda x: True,
    meta=dict(type="City", source="Census", type_category="US City"),
    does_overlap_self=False,
    drop_dup="counties",
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="CITY",
    data_credit=dict(
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
    ),
    include_in_syau=True,
)
