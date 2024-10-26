from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.special_cases.country import subnational_regions


SUBNATIONAL_REGIONS = Shapefile(
    hash_key="subnational_regions_10",
    path=subnational_regions,
    shortname_extractor=lambda x: x["NAME"],
    longname_extractor=lambda x: x["fullname"],
    filter=lambda x: x.COUNTRY is not None,
    meta=dict(type="Subnational Region", source="ESRI", type_category="US Subdivision"),
    american=False,
    include_in_gpw=True,
)
