import numpy as np
import pandas as pd
from permacache import permacache

from urbanstats.census_2010.cdc import disaggregate_to_2010
from urbanstats.data.census_blocks import all_densities_gpd
from urbanstats.geometry.census_aggregation import aggregate_by_census_block


@permacache("urbanstats/census_2010/usda_food_research_atlas/usda_fra_tract_3")
def usda_fra_tract():
    food_access = pd.read_excel(
        "named_region_shapefiles/FoodAccessResearchAtlasData2019.xlsx",
        sheet_name="Food Access Research Atlas",
    )
    food_access = food_access.set_index("CensusTract")
    food_access_filt = food_access[
        [
            "lapophalfshare",
            "lapop1share",
            "lapop10share",
            "lapop20share",
        ]
    ]
    food_access_filt /= 100
    food_access_filt = food_access_filt.copy()
    food_access_filt[food_access_filt > 1] = 1
    return food_access_filt.fillna(0)


@permacache("urbanstats/census_2010/usda_food_research_atlas/usda_fra_block_2")
def usda_fra_block():
    return disaggregate_to_2010(usda_fra_tract())


@permacache(
    "urbanstats/census_2010/usda_food_research_atlas/aggregated_usda_fra_1",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def aggregated_usda_fra(shapefile):
    census_2010_pop = all_densities_gpd(2010).population

    print("Aggregating USDA FRA for", shapefile.hash_key)
    usda_fra = usda_fra_block().reset_index(drop=True).copy()
    usda_fra.columns = [x + "_usda_fra_1" for x in usda_fra.columns]
    usda_fra = usda_fra * np.array(census_2010_pop)[:, None]

    return aggregate_by_census_block(2010, shapefile, usda_fra)
