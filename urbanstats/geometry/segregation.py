"""
Homogenity metric:

Racial demographics of a region S:
RD(S)[r] = E_{q in S} (R(q) == r)

H(S) = E_{p in S} E_{q in n(p)} sum_r (R(p) == r) (R(q) == r)
     = (sum_{b in S} |b| E_{p in b} E_{q in n(p)} sum_r (R(p) == r) (R(q) == r)) / sum_{b in S} |b|
     = (sum_{b in S} |b| H(b)) / |S|
     = E_{b in S} H(b)

H(b) = 1 / |b| sum_{p in b} E_{q in n(p)} sum_r (R(p) == r) (R(q) == r)
     = 1 / |b| sum_{p in b} sum_r (R(p) == r) RD(n(p))[r]
     = sum_r RD(p)[r] RD(n(p))[r]
     = RD(p)^T RD(n(p))

So H(S) can be written as
H(S) = E_{b in S} [v_b^T u_b]
    where v_b = RD(b) and u_b = RD(n(b))
    let w_b = u_b - v_b, which must also be positive in every entry

E_x[v_x^T u_x] - E_x[v_x]^T E_x[u_x]
    = E_x[v_x^T v_x] + E_x[v_x^T w_x] - E_x[v_x]^T E_x[v_x] - E_x[v_x]^T E_x[w_x]
    = Var(v_x) + Cov(v_x, w_x)
"""

from functools import lru_cache


import numpy as np
import pandas as pd
from permacache import permacache

from urbanstats.data.census_blocks import all_densities_gpd, load_raw_census
from urbanstats.geometry.ellipse import locate_blocks
from urbanstats.geometry.census_aggregation import aggregate_by_census_block
from urbanstats.statistics.collections.race_census import RaceCensus


@lru_cache(None)
def race_columns():
    return list(RaceCensus().name_for_each_statistic())


@lru_cache(None)
def compute_homogenity_info_by_block(year, radius):
    """
    Computes the homogenity metric per block. Returns the homogenity metric (uTv),
    the racial demographics of the block (v), and the racial demographics of the
    nearby blocks (u).
    """
    _, _, _, _, coords = load_raw_census(year=year)
    race_data = compute_race_data(year)
    race_nearby = locate_blocks(coordinates=coords, population=race_data, radius=radius)
    v = race_data / race_data.sum(-1, keepdims=True)
    u = race_nearby / race_nearby.sum(-1, keepdims=True)
    vTu = (v * u).sum(-1)
    return vTu, v, u


@lru_cache(None)
def local_segregation_by_block(year, radius_small, radius_large):
    _, popu, _, _, coords = load_raw_census(year=year)
    vTu_sm, v_sm, u_sm = compute_homogenity_info_by_block(year, radius_small)
    collapsed = locate_blocks(
        coordinates=coords,
        population=np.concatenate([vTu_sm[:, None], v_sm, u_sm], axis=1) * popu,
        radius=radius_large,
    )
    evTu = collapsed[:, 0]
    ev = collapsed[:, 1 : 1 + v_sm.shape[1]]
    pop_this = ev.sum(-1)[:, None]
    eu = collapsed[:, 1 + v_sm.shape[1] :]
    ev = ev / pop_this
    eu = eu / pop_this
    evTu = evTu / pop_this[:, 0]
    return evTu - (ev * eu).sum(-1)


@permacache(
    "urbanstats/geometry/segregation/compute_homogenity_info_by_shapefile_4",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_homogenity_info_by_shapefile(year, radius_small, radius_large, shapefile):
    census_pop = all_densities_gpd(year).population

    print("Aggregating homogenity info", shapefile.hash_key)
    vTu, v, u = compute_homogenity_info_by_block(year, radius_small)

    segregation_by_block = local_segregation_by_block(year, radius_small, radius_large)

    pop = np.array(census_pop)[:, None]
    frame = np.concatenate(
        [
            pop,
            pop * segregation_by_block[:, None],
            pop * vTu[:, None],
            pop * v,
            pop * u,
        ],
        axis=-1,
    )
    frame = pd.DataFrame(frame)

    result = aggregate_by_census_block(year, shapefile, frame)
    result = np.array(result)
    pop = result[:, 0]
    result = result[:, 1:] / pop[:, None]
    segregation = result[:, 0]
    evTu = result[:, 1]
    ev = result[:, 2 : 2 + v.shape[1]]
    eu = result[:, 2 + v.shape[1] :]
    evTeu = (ev * eu).sum(-1)
    evTeu = (ev * eu).sum(-1)
    return segregation, evTu, evTeu


def compute_homogenity_statistics(year, radius_small, radius_large, shapefile):
    (
        local_segregation,
        homogenity,
        expected_homogenity,
    ) = compute_homogenity_info_by_shapefile(
        year, radius_small, radius_large, shapefile
    )
    segregation = (homogenity - expected_homogenity) / (1 - expected_homogenity)
    return homogenity, segregation, local_segregation


@lru_cache(None)
def compute_race_data(year):
    _, _, _, data, _ = load_raw_census(year=year)
    races_original = race_columns()
    races = list(races_original)
    races.remove("other / mixed")
    races.extend(["other", "mixed"])
    race_data = np.array([data[race] for race in races])
    other_mixed = race_data[-2:].sum(0)
    race_data = np.concatenate([race_data[:-2], [other_mixed]])
    race_data = race_data.T
    return race_data
