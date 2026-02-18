import glob
import os
import subprocess
from functools import lru_cache
from pathlib import Path

import attr
import geopandas as gpd
import numpy as np
import pandas as pd
import tqdm.auto as tqdm
import us

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.census_blocks import all_densities_gpd
from urbanstats.geometry.census_aggregation import aggregate_by_census_block
from urbanstats.geometry.disaggregate import disaggregate_by_area


@attr.s
class VestElection:
    key = attr.ib()
    name = attr.ib()
    path = attr.ib()
    presidential_column_filter = attr.ib()
    dem_column_filter = attr.ib()
    gop_column_filter = attr.ib()

    def read(self):
        if callable(self.path):
            frame = self.path()
        else:
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
        result = gpd.GeoDataFrame(
            {
                "dem": dem,
                "gop": gop,
                "total": total,
                "geometry": frame.geometry,
            }
        )
        # Add state column if it exists in the frame
        if "state" in frame.columns:
            result["state"] = frame["state"]
        return result


def load_2024():
    root_path = "named_region_shapefiles/2024Precincts"
    file_path = os.path.join(root_path, "output/all.shp")
    if not os.path.exists(file_path):
        subprocess.check_call(["python", "load_state_presidential.py"], cwd=root_path)
    frame = gpd.read_file(file_path)
    # Add state column with 2-digit abbreviation
    if "state_name" in frame.columns:
        # Map state name to abbreviation
        state_name_to_abbr = {
            state.name: state.abbr for state in us.states.STATES + [us.states.DC]
        }
        frame["state"] = frame["state_name"].map(state_name_to_abbr)
    elif "STATE_ABBR" in frame.columns:
        frame["state"] = frame["STATE_ABBR"]
    else:
        # If no state info, try to infer from other columns or set to None
        frame["state"] = None
    return frame


data_cols = ["dem", "gop", "total"]

vest_elections = [
    VestElection(
        key="vest_2024_v2",
        name="2024 Presidential Election",
        path=load_2024,
        presidential_column_filter=lambda x: x in ["dem", "rep", "oth"],
        dem_column_filter=lambda x: x == "dem",
        gop_column_filter=lambda x: x == "rep",
    ),
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


@permacache_with_remapping_pickle("election_data/read_2")
def read(path):
    frame = gpd.read_file(path)
    frame = frame.to_crs("epsg:4326")
    return frame


@permacache_with_remapping_pickle("election_data/read_full_vest_data_3")
def read_full_vest_data(path):
    frames = []
    for state_obj in tqdm.tqdm(us.states.STATES + [us.states.DC]):
        state_abbr_lower = state_obj.abbr.lower()
        files = glob.glob(f"{path}/{state_abbr_lower}*")
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
        frame = read(file)
        frame["state"] = state_obj.abbr
        frames.append(frame)
    return gpd.GeoDataFrame(pd.concat(frames, ignore_index=True))


@permacache_with_remapping_pickle("election_data/load_block_shapefiles_5")
def load_block_shapefiles(state_abbr, year=2020):
    """
    Load census block shapefiles for a specific state from downloaded zip files.
    Returns a GeoDataFrame with blocks for that state, including GEOID and geometry.

    Args:
        state_abbr: State abbreviation (e.g., "CA", "NY", "DC")
        year: Census year (default: 2020)
    """
    shapefile_dir = Path("named_region_shapefiles/census_blocks/shapefiles")

    # Get the state object
    state = us.states.lookup(state_abbr)
    if state is None:
        raise ValueError(f"Invalid state abbreviation: {state_abbr}")

    fips = state.fips
    state_file = shapefile_dir / f"tl_{year}_{fips}_tabblock20.zip"

    if not state_file.exists():
        raise FileNotFoundError(
            f"Block shapefile not found for {state.name} ({state_abbr}): {state_file}. "
            f"Run named_region_shapefiles/census_blocks/download.py first."
        )

    # Load all dense data to get the index structure
    dense = all_densities_gpd(year)[["geoid", "population"]].copy()
    backmap = {x[len("7500000US") :]: y for x, y in zip(dense.geoid, dense.index)}

    # Filter dense to only blocks from this state
    state_fips_prefix = fips
    dense_state = dense[
        dense.geoid.str[len("7500000US") : len("7500000US") + 2] == state_fips_prefix
    ].copy()
    dense_state["geometry"] = None

    # Load blocks for this state
    state_blocks = gpd.read_file(state_file)
    indices = state_blocks.GEOID20.map(backmap)
    mask = ~np.isnan(indices)
    dense_state.loc[indices[mask].astype(int), "geometry"] = list(
        state_blocks.geometry[mask]
    )

    return gpd.GeoDataFrame(dense_state, geometry="geometry", crs="epsg:4326")


@permacache_with_remapping_pickle(
    "urbanstats/data/election_data/disaggregate_to_blocks_for_state_2",
    key_function=dict(state_abbr=lambda x: x, election=lambda x: x.key),
)
def disaggregate_to_blocks_for_state(state_abbr, election, block_year=2020):
    """
    Disaggregate election results to census blocks for a single state.

    Args:
        state_abbr: State abbreviation
        elect_with_index: Election/precinct data
        block_year: Census year

    Returns:
        Dictionary mapping block index to allocated votes array
    """

    elect = election.read()

    print(f"Processing {state_abbr}...")

    # Load blocks for this state (already a GeoDataFrame)
    blocks_gdf = load_block_shapefiles(state_abbr, block_year).copy()
    blocks_gdf = blocks_gdf.to_crs("epsg:4326")

    # Filter election data to this state
    elect = elect[elect.state == state_abbr].reset_index(drop=True).copy()

    # Use general disaggregation function
    disaggregated = disaggregate_by_area(
        precincts_gdf=elect,
        blocks_gdf=blocks_gdf,
        data_columns=data_cols,
        population_col="population",
    )

    # Return dictionary mapping block index to allocated votes array
    return {idx: row.values for idx, row in disaggregated.iterrows()}


@permacache_with_remapping_pickle(
    "election_data/disaggregate_to_blocks_7",
    key_function=dict(election=lambda x: x.key),
)
def disaggregate_to_blocks(election, block_year=2020):
    """
    Disaggregate election results to census blocks using area-proportional allocation.

    For blocks that are split among multiple precincts, population is allocated
    proportionally based on the area of each portion.
    """
    # Load election/precinct data once

    # Get the full index structure from dense (for output alignment)
    dense = all_densities_gpd(block_year)

    # Process each state
    all_block_results = {}
    for state in tqdm.tqdm(
        us.states.STATES + [us.states.DC], desc="Disaggregating by state"
    ):
        # Process this state (loads blocks internally)
        state_results = disaggregate_to_blocks_for_state(
            state.abbr, election, block_year
        )
        all_block_results.update(state_results)

    disaggregated = np.array(
        [all_block_results.get(i, np.zeros(len(data_cols))) for i in dense.index]
    )
    disaggregated = pd.DataFrame(disaggregated, columns=data_cols)

    return disaggregated


@permacache_with_remapping_pickle(
    "election_data/aggregated_election_results_5",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def aggregated_election_results(shapefile):
    return aggregate_by_census_block(2020, shapefile, election_results_by_block())


@lru_cache(None)
def election_results_by_block():
    blocks_edited = {}
    for election in tqdm.tqdm(vest_elections):
        disaggregated = disaggregate_to_blocks(election)
        for col in data_cols:
            blocks_edited[(election.name, col)] = disaggregated[col]
    return pd.DataFrame(blocks_edited)
