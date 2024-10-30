import numpy as np
import pandas as pd
import tqdm.auto as tqdm
from permacache import permacache

from urbanstats.acs.load import extract_tract_geoid
from urbanstats.data.census_blocks import all_densities_gpd, load_raw_census
from urbanstats.geometry.census_aggregation import aggregate_by_census_block


@permacache("urbanstats/census_2010/cdc_table")
def cdc_table():
    cdc = pd.read_csv(
        "named_region_shapefiles/PLACES__Local_Data_for_Better_Health__Census_Tract_Data_2023_release_20240531.csv"
    )
    cdc_p = cdc.pivot(values="Data_Value", index="LocationName", columns="MeasureId")
    return disaggregate_to_2010(cdc_p / 100)


def disaggregate_to_2010(data_table_by_tract, ignore_pr=False):
    geoid, *_ = load_raw_census(2010, filter_zero_pop=True)
    indices, bad, ignored = compute_disaggregated_geoids(
        data_table_by_tract.index, geoid, ignore_pr=ignore_pr
    )
    cdc_by_block = (data_table_by_tract).loc[indices].copy()
    cdc_by_block.iloc[bad] = np.nan
    cdc_by_block = cdc_by_block.fillna(cdc_by_block.mean(0))
    cdc_by_block.iloc[ignored] = np.nan
    return cdc_by_block


def compute_disaggregated_geoids(tracts, blocks, ignore_pr=False):
    indices = []
    bad = []
    ignored = []
    for i, g in enumerate(tqdm.tqdm(blocks)):
        idx = extract_tract_geoid(g)
        if ignore_pr and idx[:2] == "72":
            ignored.append(int(idx))
            indices.append(tracts[0])
            continue

        idx = int(idx)
        if idx in tracts:
            indices.append(idx)
        else:
            indices.append(tracts[0])
            bad.append(i)
    return indices, bad, ignored


@permacache(
    "urbanstats/census_2010/aggregated_cdc_table",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def aggregated_cdc_table(shapefile):
    print("aggregating cdc for", shapefile.hash_key)
    census = all_densities_gpd(2010).copy()
    cdc = cdc_table().reset_index(drop=True).copy()
    cdc.columns = [x + "_cdc_2" for x in cdc.columns]
    cdc = cdc * np.array(census.population_18)[:, None]
    return aggregate_by_census_block(2010, shapefile, cdc)
