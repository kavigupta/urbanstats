from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.utils import name_components

CSAs = Shapefile(
    hash_key="census_csas_4",
    path="named_region_shapefiles/cb_2018_us_csa_500k.zip",
    shortname_extractor=lambda x: name_components("CSA", x)[0],
    longname_extractor=lambda x: ", ".join(name_components("CSA", x, abbreviate=True)),
    filter=lambda x: True,
    meta=dict(type="CSA", source="Census", type_category="Census"),
)
