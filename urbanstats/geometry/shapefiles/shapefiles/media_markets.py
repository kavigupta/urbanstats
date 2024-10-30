from urbanstats.geometry.shapefiles.shapefile import Shapefile

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
)
