"""
Area-proportional disaggregation of data from one geographic unit to another.

This module provides functions to disaggregate data from larger geographic units
(e.g., precincts) to smaller units (e.g., census blocks) using area-proportional
allocation. When a smaller unit is split across multiple larger units, population
and data are allocated proportionally based on the area of each intersection.
"""

import geopandas as gpd
import pandas as pd


def disaggregate_by_area(
    precincts_gdf,
    blocks_gdf,
    data_columns,
    population_col="population",
):
    """
    Disaggregate data from precincts to blocks using area-proportional allocation.

    For blocks that are split among multiple precincts, population and data are allocated
    proportionally based on the area of each intersection.

    Args:
        precincts_gdf: GeoDataFrame with precincts containing data to disaggregate
        blocks_gdf: GeoDataFrame with blocks to receive disaggregated data
        data_columns: List of column names in precincts_gdf to disaggregate
        population_col: Name of population column in blocks_gdf (default: "population")

    Returns:
        DataFrame with block indices as index and disaggregated data columns.
        Only includes blocks that intersect with precincts.
    """
    # pylint: disable=too-many-locals
    # Internal column names for indices
    precinct_index_col = "_precinct_index"
    block_index_col = "_block_index"

    # Ensure both GeoDataFrames are in the same CRS
    if precincts_gdf.crs != blocks_gdf.crs:
        blocks_gdf = blocks_gdf.to_crs(precincts_gdf.crs)

    # Create copies to avoid modifying originals
    precincts = precincts_gdf.copy()
    blocks = blocks_gdf.copy()

    # Add index columns
    precincts[precinct_index_col] = precincts.index
    blocks[block_index_col] = blocks.index

    # Prepare columns for overlay
    precinct_cols = [precinct_index_col, "geometry"] + data_columns
    block_cols = [block_index_col, population_col, "geometry"]

    # Use overlay to get intersections - this handles blocks split across precinct boundaries
    intersections = gpd.overlay(
        blocks[block_cols].reset_index(),
        precincts[precinct_cols],
        how="intersection",
        keep_geom_type=False,
    )

    if len(intersections) == 0:
        # Return empty DataFrame with correct structure
        return pd.DataFrame(index=blocks.index, columns=data_columns, data=0.0)

    # Calculate area of each intersection using an equal-area projection
    intersections["area"] = intersections.to_crs("+proj=cea").geometry.area

    # Calculate total area of each block from the intersections
    block_to_area = intersections.groupby(block_index_col)["area"].sum().to_dict()

    # Allocate population proportionally based on area
    # population[intersection] = population[block] * area[intersection] / area[block]
    intersections["intersection_as_proportion_of_block"] = intersections[
        "area"
    ] / intersections[block_index_col].map(block_to_area)
    intersections["allocated_population"] = (
        intersections[population_col]
        * intersections["intersection_as_proportion_of_block"]
    )

    # Aggregate by precinct to get total allocated population per precinct
    precinct_to_induced_population = intersections.groupby(precinct_index_col)[
        "allocated_population"
    ].sum()

    # portion_precinct is the proportion of the precinct's population that comes from this intersection
    intersections["portion_precinct"] = intersections[
        "allocated_population"
    ] / intersections[precinct_index_col].map(precinct_to_induced_population)

    # Compute the data for each intersection element
    intersections[data_columns] = (
        precincts[data_columns]
        .loc[intersections[precinct_index_col]]
        .reset_index(drop=True)
    )
    for col in data_columns:
        intersections[col] *= intersections["portion_precinct"]

    # Aggregate by block to get the disaggregated data for each block
    block_results = intersections.groupby(block_index_col)[data_columns].sum()

    # Create output DataFrame with all blocks (fill missing with zeros)
    result = pd.DataFrame(index=blocks.index, columns=data_columns, data=0.0)
    result.loc[block_results.index, data_columns] = block_results[data_columns]

    return result
