import re

import tqdm.auto as tqdm

from urbanstats.geometry.relationship import full_relationships, ordering_idx
from urbanstats.ordinals.flat_ordinals import compute_flat_ordinals
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names
from urbanstats.website_data.sharding import create_filename
from urbanstats.website_data.statistic_index_lists import (
    index_bitvector_for_longname,
    index_list_for_longname,
)


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
):
    # pylint: disable=too-many-locals,too-many-arguments
    statistic_names = internal_statistic_names()
    idxs_by_type = index_list_for_longname(row.longname, row.type)
    data = data_files_pb2.Article()
    data.statistic_indices_packed = bytes(index_bitvector_for_longname(row.longname, row.type))
    data.shortname = row.shortname
    data.longname = row.longname
    data.source = row.source
    data.article_type = row.type
    data.universes.extend(row.universes)

    ords, percs = flat_ords.query(long_to_idx[row.longname])

    for idx in idxs_by_type:
        stat = statistic_names[idx]
        statrow = data.rows.add()
        statrow.statval = float(row[stat])

        ordinals_by_type, ordinals_overall = ords[idx]
        percs_by_typ, _ = percs[idx]

        for ordinal_by_type, ordinal_overall, percentile_by_type in zip(
            ordinals_by_type, ordinals_overall, percs_by_typ
        ):
            statrow.ordinal_by_universe.append(int(ordinal_by_type))
            statrow.overall_ordinal_by_universe.append(int(ordinal_overall))
            statrow.percentile_by_population_by_universe.append(percentile_by_type)
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


def create_article_gzips(site_folder, full, ordering):
    long_to_short = dict(zip(full.longname, full.shortname))
    long_to_pop = dict(zip(full.longname, full.population))
    long_to_type = dict(zip(full.longname, full.type))
    long_to_idx = {x: i for i, x in enumerate(full.longname)}

    flat_ords = compute_flat_ordinals(full, ordering)

    relationships = full_relationships(long_to_type)
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
        )


def order_key_for_relatioships(longname, typ):
    processed_longname = longname
    if typ == "Historical Congressional District":
        parsed = re.match(r".*[^\d](\d+)[^\d]*Congress", longname)
        end_congress = int(parsed.group(1))
        processed_longname = -end_congress, longname
    return ordering_idx[typ], processed_longname


def extra_stats():
    result = {}
    for statistic_collection in statistic_collections:
        result.update(statistic_collection.extra_stats())
    name_to_idx = {name: idx for idx, name in enumerate(internal_statistic_names())}
    extra = {name_to_idx[k]: v for k, v in result.items()}
    return extra
