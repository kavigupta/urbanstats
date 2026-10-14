# pylint: disable=duplicate-code
from urbanstats.geometry.shapefiles.shapefile import (
    Geometry,
    Metadata,
    Naming,
    Shapefile,
)
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider

MEDIA_MARKETS = Shapefile(
    geometry=Geometry(
        key="media_markets_2",
        path="named_region_shapefiles/NatDMA.zip",
        filter=lambda x: x.NAME != "National",
    ),
    naming=Naming(
        shortname_extractor=lambda x: x["NAME"] + " Media Market",
        longname_extractor=lambda x: x["NAME"] + " Media Market, USA",
        cleanname_extractor=lambda x: x["NAME"],
    ),
    metadata=Metadata(
        meta=dict(
            type="Media Market",
            source="Nielsen via Kenneth C Black",
            type_category="Oddball",
        ),
        does_overlap_self=False,
        abbreviation="MMAR",
        data_credit=dict(
            linkText="Kenneth C Black",
            link="https://datablends.us/2021/01/14/a-useful-dma-shapefile-for-tableau-and-alteryx/",
        ),
        include_in_syau=True,
        wikidata_sourcer=None,
    ),
    universe_provider=us_domestic_provider(),
    special_data_sources=["congressional_representatives_indirect"],
    source_countries=InCountry("USA"),
)
