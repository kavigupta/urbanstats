from urbanstats.geometry.shapefiles.shapefile import Shapefile


CCDs = Shapefile(
    hash_key="census_cousub_8",
    path="named_region_shapefiles/cb_2022_us_cousub_500k.zip",
    shortname_extractor=lambda x: f"{x.NAMELSAD}",
    longname_extractor=lambda x: f"{x.NAMELSAD} [CCD], {x.NAMELSADCO}, {x.STATE_NAME}, USA",
    filter=lambda x: True,
    meta=dict(type="CCD", source="Census", type_category="Census"),
)
