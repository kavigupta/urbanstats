import gzip
import os

import tqdm.auto as tqdm
from permacache import permacache, stable_hash

from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import ensure_writeable, write_gzip
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names
from urbanstats.universe.universe_constants import ZERO_POPULATION_UNIVERSES
from urbanstats.universe.universe_list import all_universes
from urbanstats.website_data.output_geometry import convert_to_protobuf
from urbanstats.website_data.table import shapefile_without_ordinals

from ..utils import output_typescript

use = [x.meta["type"] for x in shapefiles.values()]


def produce_results(row_geo):
    res = row_geo.geometry
    geo = convert_to_protobuf(res)
    return geo


@permacache(
    "urbanstats/consolidated_data/produce_consolidated_data/produce_all_results_from_tables_5",
    key_function=dict(
        loaded_shapefile=lambda x: x.hash_key,
        longnames=stable_hash,
        universes=stable_hash,
    ),
)
def produce_all_results_from_tables(
    loaded_shapefile, longnames, universes, limit=5 * 1024 * 1024
):
    simplify_amount = 0
    while simplify_amount < 20 / 3600:
        shapes = produce_results_from_tables_at_simplify_amount(
            loaded_shapefile, longnames, universes, simplify_amount
        )
        if shapes.ByteSize() < limit:
            break
        simplify_amount = (
            simplify_amount + 1 / 3600
            if simplify_amount == 0
            else simplify_amount * 1.5
        )
    return shapes.SerializeToString(), simplify_amount


def produce_results_from_tables_at_simplify_amount(
    loaded_shapefile, longnames, universes, simplify_amount
):
    geo_table = loaded_shapefile.load_file()

    geo_table = geo_table.set_index("longname")
    geo_table = geo_table.loc[longnames].copy()
    if simplify_amount != 0:
        if loaded_shapefile.does_overlap_self:
            # can't use simplify_coverage for overlapping geometries
            # because it will not work correctly
            geo_table.geometry = geo_table.geometry.simplify(simplify_amount)
        else:
            geo_table.geometry = geo_table.geometry.simplify_coverage(simplify_amount)
    shapes = data_files_pb2.ConsolidatedShapes()
    for longname, universe_for_this in tqdm.tqdm(
        zip(longnames, universes), total=len(longnames)
    ):
        row_geo = geo_table.loc[longname]
        g = produce_results(row_geo)
        shapes.longnames.append(longname)
        shapes.shapes.append(g)
        shapes.universes.append(
            data_files_pb2.Universes(universe_idxs=universe_for_this)
        )
    return shapes


def produce_results_for_type(folder, typ):
    print(typ)
    folder = f"{folder}/consolidated/"
    try:
        os.makedirs(folder)
    except FileExistsError:
        pass
    full = shapefile_without_ordinals()
    data_table = full[full.type == typ]
    data_table, shapes, simplification = compute_geography(typ, data_table)
    print(f'Simplification amount: {simplification * 3600:.0f}" of arc')
    path = f"{folder}/shapes__{typ}.gz"
    ensure_writeable(path)
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(shapes)


def compute_geography(typ, data_table):
    [loaded_shapefile] = [x for x in shapefiles.values() if x.meta["type"] == typ]
    longnames = sorted(data_table.longname)
    universe_to_idx = {universe: idx for idx, universe in enumerate(all_universes())}
    universes = (
        data_table[["universes", "longname"]]
        .set_index("longname")
        .universes.loc[longnames]
        .apply(
            lambda x: [
                universe_to_idx[universe]
                for universe in x
                if universe not in ZERO_POPULATION_UNIVERSES
            ]
        )
        .tolist()
    )
    shapes, simplification = produce_all_results_from_tables(
        loaded_shapefile, longnames, universes
    )

    return data_table, shapes, simplification


def full_consolidated_data(folder):
    for typ in use:
        produce_results_for_type(folder, typ)


def output_names(mapper_folder):
    with open(f"{mapper_folder}/used_geographies.ts", "w") as f:
        output_typescript(use, f)
