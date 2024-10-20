import json
import os

import shapely.geometry
import tqdm.auto as tqdm

from output_geometry import convert_to_protobuf
from shapefiles import filter_table_for_type, load_file_for_type, shapefiles
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip

use = [
    "State",
    "County",
    "MSA",
    "CSA",
    "Urban Area",
    "Congressional District",
    "Media Market",
    "Hospital Referral Region",
]
dont_use = [
    "ZIP",
    "CCD",
    "City",
    "Neighborhood",
    "State House District",
    "State Senate District",
    "Historical Congressional District",
    "Native Area",
    "Native Statistical Area",
    "Native Subdivision",
    "School District",
    "Judicial District",
    "Judicial Circuit",
    "Continent",
    "Country",
    "Subnational Region",
    "County Cross CD",
    "USDA County Type",
    "Hospital Service Area",
]


def produce_results(row_geo, row):
    from urbanstats.statistics.output_statistics_metadata import (
        internal_statistic_names,
    )

    res = row_geo.geometry.simplify(0.01)
    geo = convert_to_protobuf(res)
    results = data_files_pb2.AllStats()
    for stat in internal_statistic_names():
        results.stats.append(row[stat])
    return geo, results


def produce_all_results_from_tables(geo_table, data_table):
    shapes = data_files_pb2.ConsolidatedShapes()
    stats = data_files_pb2.ConsolidatedStatistics()
    for longname in tqdm.tqdm(data_table.index):
        row_geo = geo_table.loc[longname]
        row = data_table.loc[longname]
        g, s = produce_results(row_geo, row)
        shapes.longnames.append(longname)
        stats.longnames.append(longname)
        stats.shortnames.append(row.shortname)
        shapes.shapes.append(g)
        stats.stats.append(s)
    return shapes, stats


def produce_results_for_type(folder, typ):
    from create_website import shapefile_without_ordinals

    print(typ)
    folder = f"{folder}/consolidated/"
    try:
        os.makedirs(folder)
    except FileExistsError:
        pass
    full = shapefile_without_ordinals()
    data_table = filter_table_for_type(full, typ)
    data_table = data_table.set_index("longname")
    # [sh] = [x for x in shapefiles.values() if x.meta["type"] == typ]
    # geo_table = sh.load_file()
    geo_table = load_file_for_type(typ)
    geo_table = geo_table.set_index("longname")
    shapes, stats = produce_all_results_from_tables(geo_table, data_table)
    write_gzip(shapes, f"{folder}/shapes__{typ}.gz")
    write_gzip(stats, f"{folder}/stats__{typ}.gz")


def full_consolidated_data(folder):
    assert set(use) & set(dont_use) == set()
    for typ in use:
        produce_results_for_type(folder, typ)


def output_names():
    mapper_folder = "react/src/data/mapper"
    try:
        os.makedirs(mapper_folder)
    except FileExistsError:
        pass
    with open(f"{mapper_folder}/used_geographies.json", "w") as f:
        json.dump(use, f)
