import us

from urbanstats.geometry.shapefiles.shapefile import Shapefile


def county_name(row):
    f = row["NAMELSAD"]
    if f.lower().endswith("city"):
        f = f + "-County"
    return f


COUNTIES = Shapefile(
    hash_key="census_counties_7",
    path="named_region_shapefiles/cb_2022_us_county_500k.zip",
    shortname_extractor=county_name,
    longname_extractor=lambda x: county_name(x)
    + ", "
    + us.states.lookup(x["STATEFP"]).name
    + ", USA",
    filter=lambda x: True,
    meta=dict(type="County", source="Census", type_category="US Subdivision"),
)
