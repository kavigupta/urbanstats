from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.special_cases.ghsl_urban_center import load_ghsl_urban_center

URBAN_CENTERS = Shapefile(
    hash_key="urban_centers_4",
    path=load_ghsl_urban_center,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    meta=dict(type="Urban Center", source="GHSL", type_category="International"),
    filter=lambda x: True,
    american=False,
    include_in_gpw=True,
)
URBAN_CENTERS_USA = Shapefile(
    hash_key="us_urban_centers_5",
    path=load_ghsl_urban_center,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    meta=dict(type="Urban Center", source="GHSL", type_category="International"),
    filter=lambda x: "USA" == x.suffix,
    american=True,
    include_in_gpw=False,
)
