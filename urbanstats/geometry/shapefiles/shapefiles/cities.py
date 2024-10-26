from urbanstats.geometry.shapefiles.shapefile import Shapefile


import us


CITIES = Shapefile(
    hash_key="census_places_6",
    path="named_region_shapefiles/cb_2022_us_place_500k.zip",
    shortname_extractor=lambda x: x.NAMELSAD,
    longname_extractor=lambda x: f"{x.NAMELSAD}, {us.states.lookup(x.STATEFP).name}, USA",
    filter=lambda x: True,
    meta=dict(type="City", source="Census", type_category="US Subdivision"),
    drop_dup="counties",
)
