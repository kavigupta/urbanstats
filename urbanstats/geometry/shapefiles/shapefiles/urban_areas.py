from dataclasses import dataclass

from urbanstats.data.wikipedia.wikidata_sourcer import SimpleWikidataSourcer
from urbanstats.geometry.shapefiles.row_functions import RowFunction, column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


@dataclass(frozen=True)
class UrbanAreaName(RowFunction):
    is_shortname: bool

    def __call__(self, row):
        name = row.NAMELSAD20.replace("--", "-")
        assert name.endswith("Urban Area")
        name = name[: -len(" Urban Area")]
        *name, state = name.split(",")
        name = ", ".join(name)
        if self.is_shortname:
            return name + " Urban Area"
        name = name + " [Urban Area]," + state + ", USA"
        return name


URBAN_AREAS = make_shapefile(
    geometry_key="urban_areas",
    path="named_region_shapefiles/tl_rd22_us_uac20.zip",
    shortname_extractor=UrbanAreaName(is_shortname=True),
    cleanname_extractor=UrbanAreaName(is_shortname=True).removesuffix(" Urban Area"),
    longname_extractor=UrbanAreaName(is_shortname=False),
    additional_columns_computer={"geoid": column("GEOID20")},
    filter=lambda x: True,
    meta=dict(type="Urban Area", source="Census", type_category="Census"),
    does_overlap_self=False,
    special_data_sources=[
        ("census", "urban area"),
        "congressional_representatives_indirect",
    ],
    universe_provider=us_domestic_provider(),
    source_countries=InCountry("USA"),
    abbreviation="URBA",
    data_credit=dict(
        linkText="US Census",
        link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
    ),
    include_in_syau=True,
    wikidata_sourcer=SimpleWikidataSourcer("wdt:P12704", "geoid"),
)
