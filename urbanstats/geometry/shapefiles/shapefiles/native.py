import geopandas as gpd
from permacache import permacache

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def is_native_statistical_area(row):
    x = ce_to_name()[row.AIANNHCE]
    return "OTSA" in x or "SDTSA" in x or "ANVSA" in x or "TDSA" in x


NATIVE_AREAS = Shapefile(
    hash_key="native_areas_2",
    path="named_region_shapefiles/cb_2022_us_aiannh_500k.zip",
    shortname_extractor=lambda x: f"{x.NAMELSAD}",
    longname_extractor=lambda x: f"{x.NAMELSAD}, USA",
    filter=lambda x: not is_native_statistical_area(x),
    meta=dict(type="Native Area", source="Census", type_category="Native"),
    special_data_sources=["international_gridded_data"],
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
)
NATIVE_STATISTICAL_AREAS = Shapefile(
    hash_key="native_statistical_areas",
    path="named_region_shapefiles/cb_2022_us_aiannh_500k.zip",
    shortname_extractor=lambda x: f"{x.NAMELSAD}",
    longname_extractor=lambda x: f"{x.NAMELSAD}, USA",
    filter=is_native_statistical_area,
    meta=dict(type="Native Statistical Area", source="Census", type_category="Native"),
    special_data_sources=["international_gridded_data"],
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
)
NATIVE_SUBDIVISIONS = Shapefile(
    hash_key="native_subdivisions_2",
    path="named_region_shapefiles/cb_2022_us_aitsn_500k.zip",
    shortname_extractor=lambda x: f"{x.NAMELSAD}",
    longname_extractor=lambda x: f"{x.NAMELSAD}, {ce_to_name()[x.AIANNHCE]}, USA",
    filter=lambda x: True,
    meta=dict(type="Native Subdivision", source="Census", type_category="Native"),
    special_data_sources=["international_gridded_data"],
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
)


@permacache("population_density/ce_to_name")
def ce_to_name():
    table = gpd.read_file("named_region_shapefiles/cb_2022_us_aiannh_500k.zip")
    return dict(zip(table.AIANNHCE, table.NAMELSAD))


native_shapefiles = dict(
    native_areas=NATIVE_AREAS,
    native_statistical_areas=NATIVE_STATISTICAL_AREAS,
    native_subdivisions=NATIVE_SUBDIVISIONS,
)
