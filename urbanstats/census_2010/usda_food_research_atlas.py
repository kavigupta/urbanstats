import pandas as pd

from permacache import permacache

from urbanstats.census_2010.cdc import disaggregate_to_2010


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
