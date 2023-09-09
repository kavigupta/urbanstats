from permacache import permacache
import tqdm.auto as tqdm

import numpy as np
import pandas as pd
import shapely
import geopandas as gpd

import us

from .query import query_to_geopandas
from ..features.within_distance import census_block_coordinates, point_to_radius


def parks_for_state(state):
    query = f"""
    [out:json];
    area["name"="{state}"][admin_level=4]->.searchArea;
    (

    node["leisure"="park"](area.searchArea);
    way["leisure"="park"](area.searchArea);
    relation["leisure"="park"](area.searchArea);

    node["garden:type"="botanical"](area.searchArea);
    way["garden:type"="botanical"](area.searchArea);
    relation["garden:type"="botanical"](area.searchArea);

    /*
    node["leisure"="nature_reserve"](area.searchArea);
    way["leisure"="nature_reserve"](area.searchArea);
    relation["leisure"="nature_reserve"](area.searchArea);

    node["boundary"="national_park"](area.searchArea);
    way["boundary"="national_park"](area.searchArea);
    relation["boundary"="national_park"](area.searchArea);
    */
    );
    out body;
    >;
    out skel qt;
    >;
    out skel qt;
    """
    return query_to_geopandas(query)


@permacache("urbanstats/osm/query/parks_2")
def parks():
    return gpd.GeoDataFrame(
        pd.concat(
            [
                parks_for_state(x.name)
                for x in tqdm.tqdm(us.states.STATES + [us.states.DC, us.states.PR])
            ]
        ).reset_index(drop=True)
    )


@permacache("urbanstats/osm/query/parks_exploded_2")
def parks_exploded():
    from ..geometry.deduplicate import deduplicate_polygons

    return deduplicate_polygons(parks().geometry)


def park_overlaps(blocks, parks_df, r):
    blocks.geometry = blocks.geometry.apply(lambda p: point_to_radius(r, p))
    blocks = blocks.to_crs({"proj": "cea"}).copy()
    blocks["block_ident"] = blocks.index
    overlap = blocks.overlay(parks_df)
    park_area = (
        pd.DataFrame(dict(block_ident=overlap.block_ident, area_park=overlap.area))
        .groupby("block_ident")
        .sum()
    )
    park_area = park_area / (np.pi * (1000 * r) ** 2)
    return park_area


@permacache("urbanstats/osm/query/park_overlap_percentages_2")
def park_overlap_percentages(r):
    chunk_size = 10_000
    census_blocks = census_block_coordinates()
    result = parks_exploded()
    result = result[[not isinstance(x, shapely.Point) for x in result.geometry]]
    x = result.set_crs("epsg:4326").to_crs(crs={"proj": "cea"})
    results = [
        park_overlaps(census_blocks[start : start + chunk_size].copy(), x, r)
        for start in tqdm.trange(0, len(census_blocks), chunk_size)
    ]
    return pd.concat(results)


@permacache("urbanstats/osm/query/park_overlap_percentages_all_2")
def park_overlap_percentages_all(r):
    census_blocks = census_block_coordinates()
    pcts = park_overlap_percentages(r=r)
    by_block = np.zeros(len(census_blocks))
    by_block[pcts.index] = pcts.area_park
    return by_block
