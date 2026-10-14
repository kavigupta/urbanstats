from urbanstats.geometry.shapefiles.shapefile import (
    Geometry,
    Identifiers,
    Metadata,
    Naming,
    Shapefile,
)
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider

ZCTAs = Shapefile(
    geometry=Geometry(
        key="census_zctas",
        path="named_region_shapefiles/cb_2018_us_zcta510_500k.zip",
        filter=lambda x: True,
    ),
    identifiers=Identifiers(
        additional_columns_computer={"geoid": lambda x: x.GEOID10},
    ),
    naming=Naming(
        shortname_extractor=lambda x: f"{x.ZCTA5CE10}",
        longname_extractor=lambda x: f"{x.ZCTA5CE10}, USA",
    ),
    metadata=Metadata(
        meta=dict(type="ZIP", source="Census", type_category="Small"),
        does_overlap_self=False,
        abbreviation="ZIP",
        data_credit=dict(
            linkText="US Census",
            link="https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html",
        ),
        include_in_syau=False,
        wikidata_sourcer=None,
    ),
    universe_provider=us_domestic_provider(),
    special_data_sources=[
        ("census", "zip code tabulation area"),
        "congressional_representatives_indirect",
    ],
    source_countries=InCountry("USA"),
)
