from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.special_cases.country import countries
from urbanstats.special_cases.country_names import iso_to_country


COUNTRIES = Shapefile(
    hash_key="countries_9",
    path=countries,
    shortname_extractor=lambda x: iso_to_country(x.ISO_CC),
    longname_extractor=lambda x: iso_to_country(x.ISO_CC),
    filter=lambda x: iso_to_country(x.ISO_CC) is not None,
    meta=dict(type="Country", source="OpenDataSoft", type_category="International"),
    american=False,
    include_in_gpw=True,
    chunk_size=1,
)


def countries_usa():
    loaded_file = countries.load_file()
    loaded_file = loaded_file[loaded_file.longname.apply(lambda x: "USA" in x)]
    return loaded_file


COUNTRY_USA = Shapefile(
    hash_key="usa_only_1",
    path=countries_usa,
    shortname_extractor=lambda x: x["shortname"],
    longname_extractor=lambda x: x["longname"],
    filter=lambda x: "USA" in x.longname,
    meta=dict(type="Country", source="OpenDataSoft", type_category="International"),
    american=True,
    include_in_gpw=False,
)
