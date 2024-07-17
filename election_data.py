import glob
from functools import lru_cache

import attr
import geopandas as gpd
import numpy as np
import pandas as pd
import tqdm.auto as tqdm
import us
from permacache import permacache

from census_blocks import all_densities_gpd


@attr.s
class VestElection:
    key = attr.ib()
    name = attr.ib()
    path = attr.ib()
    presidential_column_filter = attr.ib()
    dem_column_filter = attr.ib()
    gop_column_filter = attr.ib()

    def read(self):
        frame = read_full_vest_data(self.path)
        presidential_columns = [
            c for c in frame.columns if self.presidential_column_filter(c)
        ]
        dem_columns = [c for c in presidential_columns if self.dem_column_filter(c)]
        gop_columns = [c for c in presidential_columns if self.gop_column_filter(c)]

        assert len(dem_columns) >= 1, dem_columns
        assert len(gop_columns) >= 1, gop_columns

        dem = frame[dem_columns].sum(axis=1)
        gop = frame[gop_columns].sum(axis=1)
        total = frame[presidential_columns].sum(axis=1)
        return gpd.GeoDataFrame(
            {
                "dem": dem,
                "gop": gop,
                "total": total,
                "geometry": frame.geometry,
            }
        )


data_cols = ["dem", "gop", "total"]

vest_elections = [
    VestElection(
        key="vest_2020",
        name="2020 Presidential Election",
        path="election-data/2020-vest/",
        presidential_column_filter=lambda x: x.upper().startswith("G20PRE"),
        dem_column_filter=lambda x: x.upper() == "G20PREDBID",
        gop_column_filter=lambda x: x.upper() == "G20PRERTRU",
    ),
    VestElection(
        key="vest_2016",
        name="2016 Presidential Election",
        path="election-data/2016-vest/",
        presidential_column_filter=lambda x: x.upper().startswith("G16PRE"),
        dem_column_filter=lambda x: x.upper() == "G16PREDCLI",
        gop_column_filter=lambda x: x.upper() == "G16PRERTRU",
    ),
]


@permacache("election_data/read_2")
def read(path):
    frame = gpd.read_file(path)
    frame = frame.to_crs("epsg:4326")
    return frame


@permacache("election_data/read_full_vest_data_2")
def read_full_vest_data(path):
    frames = []
    for state in tqdm.tqdm(us.states.STATES + [us.states.DC]):
        state = state.abbr.lower()
        files = glob.glob(f"{path}/{state}*")
        files = [
            x
            for x in files
            if not any(k in x for k in ["caucus", "special", "primary", "ushouse"])
        ]
        assert len(files) in [1, 2], files
        if len(files) == 1:
            file = files[0]
        else:
            [file] = [f for f in files if "vtd" in f]
        frames.append(read(file))
    return gpd.GeoDataFrame(pd.concat(frames, ignore_index=True))


@permacache(
    "election_data/disaggregate_to_blocks_3",
    key_function=dict(election=lambda x: x.key),
)
def disaggregate_to_blocks(election):
    dense = all_densities_gpd()
    blocks = dense[["population", "geometry"]]
    elect = election.read()
    cross = gpd.sjoin(blocks, elect, predicate="within")
    population_precinct = (
        cross[["population", "index_right"]].groupby("index_right").sum()
    )
    population_precinct_map = dict(
        zip(population_precinct.index, population_precinct.population)
    )
    block_to_precinct = cross[["index_right"]].groupby(cross.index).min()
    block_to_precinct = dict(
        zip(block_to_precinct.index, block_to_precinct.index_right)
    )
    precinct_idx = np.array([block_to_precinct.get(i, -1) for i in blocks.index])
    mask = precinct_idx >= 0
    portion_precinct = np.array(
        blocks.population.iloc[mask]
        / [population_precinct_map[i] for i in precinct_idx[mask]]
    )
    disaggregated = elect.loc[precinct_idx[mask], data_cols] * portion_precinct[:, None]
    return mask, disaggregated


@lru_cache(None)
def with_election_results():
    dense = all_densities_gpd()
    blocks_edited = dense.copy()
    for election in tqdm.tqdm(vest_elections):
        mask, disaggregated = disaggregate_to_blocks(election)
        for col in data_cols:
            unmasked = np.zeros(blocks_edited.shape[0])
            unmasked[mask] = np.array(disaggregated[col])
            blocks_edited[(election.name, col)] = unmasked
    return blocks_edited


election_column_names = [(x.name, y) for x in vest_elections for y in data_cols]
