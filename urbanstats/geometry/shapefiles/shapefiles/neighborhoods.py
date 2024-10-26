from urbanstats.geometry.shapefiles.shapefile import Shapefile


import us


NEIGHBORHOODS = Shapefile(
    hash_key="zillow_neighborhoods_6",
    path="named_region_shapefiles/Zillow_Neighborhoods/zillow.shp",
    shortname_extractor=lambda x: x["Name"] + ", " + x["City"],
    longname_extractor=lambda x: x["Name"]
    + " Neighborhood, "
    + x["City"]
    + " City, "
    + us.states.lookup(x["State"]).name
    + ", USA",
    filter=lambda x: True,
    meta=dict(type="Neighborhood", source="Zillow", type_category="Small"),
    drop_dup="cousub",
)
