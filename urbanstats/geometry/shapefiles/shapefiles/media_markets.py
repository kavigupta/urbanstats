from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider

MEDIA_MARKETS = Shapefile(
    hash_key="media_markets_2",
    path="named_region_shapefiles/NatDMA.zip",
    shortname_extractor=lambda x: x["NAME"] + " Media Market",
    longname_extractor=lambda x: x["NAME"] + " Media Market, USA",
    filter=lambda x: x.NAME != "National",
    meta=dict(
        type="Media Market",
        source="Nielsen via Kenneth C Black",
        type_category="Oddball",
    ),
    does_overlap_self=False,
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
    abbreviation="MMAR",
    data_credit=dict(
        linkText="Kenneth C Black",
        link="https://datablends.us/2021/01/14/a-useful-dma-shapefile-for-tableau-and-alteryx/",
    ),
    include_in_syau=True,
)
