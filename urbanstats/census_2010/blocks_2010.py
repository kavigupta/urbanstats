import numpy as np
import pandas as pd

from census_blocks import all_densities_gpd
from urbanstats.census_2010.cdc import cdc_table
from urbanstats.census_2010.usda_food_research_atlas import usda_fra_block


def block_level_data_2010():
    census = all_densities_gpd(2010).copy()
    census.columns = [
        x + "_2010" if x not in ["geoid", "geometry"] else x for x in census.columns
    ]

    cdc = cdc_table().reset_index(drop=True).copy()
    cdc.columns = [x + "_cdc_2" for x in cdc.columns]
    cdc = cdc * np.array(census.population_18_2010)[:, None]
    usda_fra = usda_fra_block().reset_index(drop=True).copy()
    usda_fra.columns = [x + "_usda_fra_1" for x in usda_fra.columns]
    usda_fra = (1 - usda_fra) * np.array(census.population_2010)[:, None]
    return pd.concat([census, cdc, usda_fra], axis=1)
