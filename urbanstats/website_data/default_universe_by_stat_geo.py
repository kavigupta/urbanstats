import os
from collections import Counter

import numpy as np
import tqdm.auto as tqdm

from urbanstats.geometry.relationship import type_to_type_category
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names
from urbanstats.universe.universe_list import all_universes


def default_universe_by_stat_geo(table):
    result = []
    universe_to_idx = {k: i for i, k in enumerate(all_universes())}
    for tidx, typ in enumerate(tqdm.tqdm(type_to_type_category)):
        subset_table_for_typ = table[(table.type == typ)]
        for sidx, stat in enumerate(internal_statistic_names()):
            subset_table_u = subset_table_for_typ.universes[
                ~subset_table_for_typ[stat].isna()
            ]
            if len(subset_table_u) == 0:
                continue
            count_by_universe = np.zeros(len(universe_to_idx))
            for us in subset_table_u:
                for u in us:
                    if u not in universe_to_idx:
                        continue
                    count_by_universe[universe_to_idx[u]] += 1
            uidx = count_by_universe.shape[0] - 1 - count_by_universe[::-1].argmax()
            result.append((tidx, sidx, uidx))
    return result


def most_common(seq):
    x, _ = sorted(Counter(seq).items(), key=lambda x: (x[1], x[0]))[-1]
    return x


def compress_default_universes(triples):
    most_common_overall = most_common(u for _, _, u in triples)
    triples = [x for x in triples if x[2] != most_common_overall]
    f = data_files_pb2.DefaultUniverseTable()
    # vulture: ignore -- protobuf
    f.most_common_universe_idx = most_common_overall
    for tidx, sidx, uidx in triples:
        f.exceptions.add(type_idx=tidx, stat_idx=sidx, universe_idx=uidx)
    return f


def output_default_universe_by_stat_geo(table, site_folder):
    res = default_universe_by_stat_geo(table)
    res = compress_default_universes(res)
    write_gzip(res, os.path.join(site_folder, "default_universe_by_stat_geo.gz"))
