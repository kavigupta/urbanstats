import geopandas as gpd

from urbanstats.geometry.shapefiles.row_functions import UsState, column
from urbanstats.geometry.shapefiles.shapefile import make_shapefile
from urbanstats.geometry.shapefiles.shapefiles.ccds import CCDs
from urbanstats.geometry.shapefiles.source_countries import InCountry
from urbanstats.universe.universe_provider.constants import us_domestic_provider


def load_neighborhoods():
    table = gpd.read_file("named_region_shapefiles/Zillow_Neighborhoods/zillow.shp")
    # Zillow lists some neighborhoods more than once, with the same name and shape
    return table[~table.geometry.to_wkb().duplicated()].reset_index(drop=True)


NEIGHBORHOODS = make_shapefile(
    geometry_key="zillow_neighborhoods_6",
    path=load_neighborhoods,
    shortname_extractor=column("Name") + ", " + column("City"),
    longname_extractor=column("Name")
    + " Neighborhood, "
    + column("City")
    + " City, "
    + UsState(column("State"))
    + ", USA",
    filter=lambda x: True,
    meta=dict(type="Neighborhood", source="Zillow", type_category="Small"),
    does_overlap_self=False,
    disambiguate_with=CCDs.names,
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
    source_countries=InCountry("USA"),
    abbreviation="NBHD",
    data_credit=dict(
        linkText="Zillow",
        link="https://catalog.data.gov/dataset/neighborhoods-us-2017-zillow-segs",
    ),
    include_in_syau=True,
    wikidata_sourcer=None,
    special_data_sources=["congressional_representatives_indirect"],
)
