import us

from urbanstats.geometry.shapefiles.shapefile import (
    Geometry,
    Metadata,
    Naming,
    Shapefile,
)
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider

NEIGHBORHOODS = Shapefile(
    geometry=Geometry(
        key="zillow_neighborhoods_6",
        path="named_region_shapefiles/Zillow_Neighborhoods/zillow.shp",
        filter=lambda x: True,
        drop_dup="cousub",
    ),
    naming=Naming(
        shortname_extractor=lambda x: x["Name"] + ", " + x["City"],
        longname_extractor=lambda x: x["Name"]
        + " Neighborhood, "
        + x["City"]
        + " City, "
        + us.states.lookup(x["State"]).name
        + ", USA",
    ),
    metadata=Metadata(
        meta=dict(type="Neighborhood", source="Zillow", type_category="Small"),
        does_overlap_self=False,
        abbreviation="NBHD",
        data_credit=dict(
            linkText="Zillow",
            link="https://catalog.data.gov/dataset/neighborhoods-us-2017-zillow-segs",
        ),
        include_in_syau=True,
        wikidata_sourcer=None,
    ),
    universe_provider=us_domestic_provider(
        {
            "Freeman Island Neighborhood, Long Beach City, California, USA": [
                "California, USA"
            ],
            "Island Chaffee Neighborhood, Long Beach City, California, USA": [
                "California, USA"
            ],
            "Island White Neighborhood, Long Beach City, California, USA": [
                "California, USA"
            ],
            "Bay Islands Neighborhood, San Rafael City, California, USA": [
                "California, USA"
            ],
            "Fair Isle Neighborhood, Miami City, Florida, USA": ["Florida, USA"],
            "House Island Neighborhood, Portland City, Maine, USA": ["Maine, USA"],
        }
    ),
    special_data_sources=["congressional_representatives_indirect"],
    source_countries=InCountry("USA"),
)
