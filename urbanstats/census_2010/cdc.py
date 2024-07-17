import numpy as np
import pandas as pd
import tqdm.auto as tqdm
from permacache import permacache

from census_blocks import load_raw_census
from urbanstats.acs.load import extract_tract_geoid


@permacache("urbanstats/census_2010/cdc_table")
def cdc_table():
    geoid, *_ = load_raw_census(2010, filter_zero_pop=True)
    cdc = pd.read_csv(
        "named_region_shapefiles/PLACES__Local_Data_for_Better_Health__Census_Tract_Data_2023_release_20240531.csv"
    )
    cdc_p = cdc.pivot(values="Data_Value", index="LocationName", columns="MeasureId")
    indices = []
    bad = []
    for i, g in enumerate(tqdm.tqdm(geoid)):
        idx = int(extract_tract_geoid(g))
        if idx in cdc_p.index:
            indices.append(idx)
        else:
            indices.append(cdc_p.index[0])
            bad.append(i)
    cdc_by_block = (cdc_p / 100).loc[indices].copy()
    cdc_by_block.iloc[bad] = np.nan
    cdc_by_block = cdc_by_block.fillna(cdc_by_block.mean(0))
    return cdc_by_block
