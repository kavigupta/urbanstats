import geopandas as gpd
import pandas as pd
from permacache import permacache

from urbanstats.geometry.shapefiles.shapefile import Shapefile
from urbanstats.geometry.shapefiles.shapefile_subset import SelfSubset
from urbanstats.universe.universe_provider.constants import us_domestic_provider


@permacache("population_density/shapefiles/usda_county_type")
def usda_county_type():
    counties = gpd.read_file("named_region_shapefiles/cb_2015_us_county_500k.zip")
    counties = counties[
        counties.apply(
            lambda x: x.GEOID[:2] not in ["60", "69", "72", "78", "66"], axis=1
        )
    ]
    typology_codes = pd.read_csv("named_region_shapefiles/2015CountyTypologyCodes.csv")
    typology_codes = {
        f"{k:05d}": v
        for k, v in zip(typology_codes.FIPStxt, typology_codes.Economic_Type_Label)
    }
    typology_codes["46102"] = typology_codes["46113"]
    typology_codes["02158"] = typology_codes["02270"]

    regions = counties.dissolve(counties.GEOID.apply(lambda x: typology_codes[x]))
    return regions


USDA_COUNTY_TYPE = Shapefile(
    hash_key="usda_county_type",
    path=usda_county_type,
    shortname_extractor=lambda x: x.name + " [USDA County Type]",
    longname_extractor=lambda x: x.name + " [USDA County Type], USA",
    filter=lambda x: True,
    meta=dict(type="USDA County Type", source="Census", type_category="Oddball"),
    universe_provider=us_domestic_provider(),
    subset_masks={"USA": SelfSubset()},
)
