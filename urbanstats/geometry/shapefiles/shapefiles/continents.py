from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.special_cases.country import continents


CONTINENTS = Shapefile(
    hash_key="continents_2",
    path=continents,
    shortname_extractor=lambda x: x.name_1,
    longname_extractor=lambda x: x.name_1,
    filter=lambda x: True,
    meta=dict(type="Continent", source="OpenDataSoft", type_category="International"),
    american=False,
    include_in_gpw=True,
    chunk_size=1,
)
