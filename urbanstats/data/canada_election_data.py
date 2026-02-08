import subprocess
from functools import lru_cache
from pathlib import Path

import attr
import geopandas as gpd
import pandas as pd
import tqdm.auto as tqdm

from urbanstats.compatibility.compatibility import permacache_with_remapping_pickle
from urbanstats.data.canada.canada_blocks import load_canada_db_shapefile
from urbanstats.geometry.census_aggregation import aggregate_by_census_block_canada
from urbanstats.geometry.disaggregate import disaggregate_by_area


@attr.s
class CanadaElection:
    key = attr.ib()
    year = attr.ib()  # e.g., 2015, 2019, 2021, 2025
    folder_key = attr.ib()  # e.g., "45GE", "44GE", etc.

    def read(self):
        zip_path = (
            Path("named_region_shapefiles/CanadaGeneralElections")
            / "data"
            / self.folder_key
            / "processed"
            / "votes_by_poll_with_geometry.zip"
        )
        if not zip_path.exists():
            run_data_gathering_script("named_region_shapefiles/CanadaGeneralElections")
        print(f"Loading Canadian election data from {zip_path}...")
        frame = gpd.read_file(str(zip_path))
        frame = frame.to_crs("epsg:4326")

        # Extract all party columns (V_* except Total)
        party_cols = [c for c in frame.columns if c.startswith("V_") and c != "Total"]
        result_dict = {col: frame[col] for col in party_cols}
        result_dict["total"] = frame["Total"]
        result_dict["geometry"] = frame.geometry

        result = gpd.GeoDataFrame(result_dict)
        return result


def run_data_gathering_script(script_folder):
    """Run the data gathering script for Canadian elections if data is missing."""
    script_path = Path(script_folder) / "gather_election_data.py"
    if not script_path.exists():
        raise FileNotFoundError(f"Data gathering script not found at {script_path}")
    print(f"Running data gathering script: {script_path}")
    subprocess.run(["python", str(script_path)], check=True)


# data_cols will be determined dynamically from the party columns in each election

canada_elections = [
    CanadaElection(
        key="canada_2015",
        year=2015,
        folder_key="42GE",
    ),
    CanadaElection(
        key="canada_2019",
        year=2019,
        folder_key="43GE",
    ),
    CanadaElection(
        key="canada_2021",
        year=2021,
        folder_key="44GE",
    ),
    CanadaElection(
        key="canada_2025",
        year=2025,
        folder_key="45GE",
    ),
]


@permacache_with_remapping_pickle(
    "canada_election_data/disaggregate_to_blocks_canada_5",
    key_function=dict(election=lambda x: x.key),
)
def disaggregate_to_blocks_canada(election, block_year=2021):
    """
    Disaggregate Canadian election results to dissemination blocks using area-proportional allocation.

    For blocks that are split among multiple polling divisions, votes are allocated
    proportionally based on the area of each intersection.
    """
    elect = election.read()

    print(f"Processing {election.year}GE...")

    # Load Canadian dissemination blocks
    blocks_gdf = load_canada_db_shapefile(block_year, pointify=False).copy()
    blocks_gdf = blocks_gdf.to_crs("epsg:4326")

    # Get all party columns (V_*) plus total
    data_columns = [c for c in elect.columns if c.startswith("V_") or c == "total"]

    # Use general disaggregation function
    disaggregated = disaggregate_by_area(
        precincts_gdf=elect,
        blocks_gdf=blocks_gdf,
        data_columns=data_columns,
        population_col="population",
    )

    return disaggregated


@permacache_with_remapping_pickle(
    "canada_election_data/aggregated_election_results_canada_3",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def aggregated_election_results_canada(shapefile):
    return aggregate_by_census_block_canada(
        2021, shapefile, election_results_by_block_canada()
    )


@lru_cache(None)
def election_results_by_block_canada():
    """Get election results disaggregated to Canadian dissemination blocks."""
    blocks_edited = {}
    for election in tqdm.tqdm(
        canada_elections, desc="Disaggregating Canadian elections"
    ):
        disaggregated = disaggregate_to_blocks_canada(election)
        # Include all party columns and total
        for col in disaggregated.columns:
            blocks_edited[(f"{election.year}GE", col)] = disaggregated[col]
    if not blocks_edited:
        raise RuntimeError(
            "No Canadian election data found. "
            "Run named_region_shapefiles/CanadaGeneralElections/gather_election_data.py first."
        )
    return pd.DataFrame(blocks_edited)
