from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def urban_area(name, *, is_shortname):
    name = name.replace("--", "-")
    assert name.endswith("Urban Area")
    name = name[: -len(" Urban Area")]
    *name, state = name.split(",")
    name = ", ".join(name)
    if is_shortname:
        return name + " Urban Area"
    name = name + " [Urban Area]," + state + ", USA"
    return name


URBAN_AREAS = Shapefile(
    hash_key="urban_areas",
    path="named_region_shapefiles/tl_rd22_us_uac20.zip",
    shortname_extractor=lambda x: urban_area(x.NAMELSAD20, is_shortname=True),
    longname_extractor=lambda x: urban_area(x.NAMELSAD20, is_shortname=False),
    filter=lambda x: True,
    meta=dict(type="Urban Area", source="Census", type_category="Census"),
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="URBA",
    data_credit=dict(
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
    ),
)
