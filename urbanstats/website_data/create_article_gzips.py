import itertools
import re
from collections import defaultdict
from functools import lru_cache

import numpy as np
import tqdm.auto as tqdm

from urbanstats.geometry.relationship import full_relationships, ordering_idx
from urbanstats.ordinals.flat_ordinals import compute_flat_ordinals
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names
from urbanstats.universe.universe_list import all_universes
from urbanstats.website_data.sharding import create_filename, create_foldername


def isnan(x):
    if isinstance(x, (float, np.float64, np.float32)):
        return np.isnan(x)
    return False


def create_article_gzip(
    folder,
    row,
    *,
    relationships,
    long_to_short,
    long_to_population,
    long_to_type,
    long_to_idx,
    flat_ords,
    counts_overall,
):
    # pylint: disable=too-many-locals,too-many-arguments
    statistic_names = internal_statistic_names()
    idxs = [i for i, x in enumerate(statistic_names) if not isnan(row[x])]
    data = data_files_pb2.Article()
    data.statistic_indices_packed = bytes(pack_index_vector(idxs))
    data.shortname = row.shortname
    data.longname = row.longname
    data.source = row.source
    data.article_type = row.type
    data.universes.extend(row.universes)

    ords, percs = flat_ords.query(long_to_idx[row.longname])

    u_to_i = universe_to_idx()
    universe_idxs = [u_to_i[u] for u in row.universes]

    counts_this = counts_overall[:, universe_idxs]

    for article_row_idx, idx in enumerate(idxs):
        stat = statistic_names[idx]
        counts_for_stat = counts_this[idx]
        statrow = data.rows.add()
        statrow.statval = float(row[stat])

        ordinals_by_type, ordinals_overall = ords[idx]
        percs_by_typ, _ = percs[idx]

        for (
            article_universes_idx,
            ordinal_by_type,
            ordinal_overall,
            count,
            percentile_by_type,
        ) in zip(
            itertools.count(),
            ordinals_by_type,
            ordinals_overall,
            counts_for_stat,
            percs_by_typ,
        ):
            statrow.ordinal_by_universe.append(int(ordinal_by_type))
            ordinal_overall = int(ordinal_overall)
            if ordinal_overall in {1, count}:
                fol = data.overall_first_or_last.add()
                fol.article_row_idx = article_row_idx
                fol.article_universes_idx = article_universes_idx
                fol.is_first = ordinal_overall == 1
            statrow.percentile_by_population_by_universe.append(
                int(percentile_by_type * 100)
            )
    for _, extra_stat in sorted(extra_stats().items()):
        data.extra_stats.append(extra_stat.create(row))
    for relationship_type in relationships:
        for_this = relationships[relationship_type].get(row.longname, set())
        for_this = [x for x in for_this if x in long_to_population]
        for_this = sorted(
            for_this, key=lambda x: order_key_for_relatioships(x, long_to_type[x])
        )
        # add to map with key relationship_type
        related_buttons = data.related.add()
        related_buttons.relationship_type = relationship_type
        for x in for_this:
            related_button = related_buttons.buttons.add()
            related_button.longname = x
            related_button.shortname = long_to_short[x]
            related_button.row_type = long_to_type[x]

    name = create_filename(row.longname, "gz")
    write_gzip(data, f"{folder}/{name}")
    return name


def create_symlink_gzips(site_folder, symlinks):
    results_by_folder = defaultdict(list)
    for link_name, target_name in symlinks.items():
        folder = create_foldername(link_name)
        results_by_folder[folder].append((link_name, target_name))
    for folder, links in results_by_folder.items():
        data = data_files_pb2.Symlinks()
        for link_name, target_name in links:
            data.link_name.append(link_name)
            data.target_name.append(target_name)
        name = folder + ".symlinks.gz"
        write_gzip(data, f"{site_folder}/data/{name}")


def create_article_gzips(site_folder, full, ordering):
    long_to_short = dict(zip(full.longname, full.shortname))
    long_to_pop = dict(zip(full.longname, full.population))
    long_to_type = dict(zip(full.longname, full.type))
    long_to_idx = {x: i for i, x in enumerate(full.longname)}

    flat_ords = compute_flat_ordinals(full, ordering)

    relationships = full_relationships(long_to_type)

    counts = ordering.counts_by_type_universe_col()
    counts_overall = {
        column: {
            typ: count
            for (typ, universe), count in for_column.items()
            if universe == "overall"
        }
        for column, for_column in counts.items()
        if for_column
    }
    counts_overall = np.array(
        [
            [counts_overall[col].get(universe, 0) for universe in all_universes()]
            for col in internal_statistic_names()
        ]
    )

    for i in tqdm.trange(full.shape[0], desc="creating pages"):
        row = full.iloc[i]
        create_article_gzip(
            f"{site_folder}/data",
            row,
            relationships=relationships,
            long_to_short=long_to_short,
            long_to_population=long_to_pop,
            long_to_type=long_to_type,
            long_to_idx=long_to_idx,
            flat_ords=flat_ords,
            counts_overall=counts_overall,
        )


@lru_cache(maxsize=None)
def universe_to_idx():
    return {u: i for i, u in enumerate(all_universes())}


def order_key_for_relatioships(longname, typ):
    processed_longname = longname
    return ordering_idx[typ], processed_longname


def extra_stats():
    result = {}
    for statistic_collection in statistic_collections:
        result.update(statistic_collection.extra_stats())
    name_to_idx = {name: idx for idx, name in enumerate(internal_statistic_names())}
    extra = {name_to_idx[k]: v for k, v in result.items()}
    return extra


def pack_index_vector(idxs):
    bool_array = np.zeros(max(idxs) + 1, dtype=np.bool_)
    bool_array[idxs] = True
    return np.packbits(bool_array, bitorder="little").tolist()
