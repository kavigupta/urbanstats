from dataclasses import dataclass
from typing import List
import attr
from permacache import permacache, stable_hash
import pandas as pd
from urbanstats.data.canada.canada_blocks import disaggregated_from_da
from urbanstats.data.canada.canada_metadata import metadata_by_table
from urbanstats.geometry.census_aggregation import aggregate_by_census_block_canada


@attr.dataclass
class CensusTables:
    tables: List[str]
    remapping: dict
    disagg_universe: str

    def compute(self, year, shapefile):
        return compute_other_census_stats(self, year, shapefile)


@permacache("urbanstats/data/canada/canadian_da_data/get_da_table_for_census_tables")
def get_da_table_for_census_tables(census_tables: CensusTables, year):
    return get_da_table(
        census_tables.tables,
        census_tables.remapping,
        year,
        census_tables.disagg_universe,
    )


@permacache(
    "urbanstats/data/canada/canadian_da_data/compute_other_census_stats",
    key_function=dict(census_tables=stable_hash, shapefile=lambda x: x.hash_key),
)
def compute_other_census_stats(census_tables, year, shapefile):
    data = get_da_table_for_census_tables(census_tables, year)
    return aggregate_by_census_block_canada(year, shapefile, data)


def get_da_table(table_names, remapping, year, disagg_universe):
    all_rows = metadata_by_table()
    rows = [row for table_name in table_names for row in all_rows[table_name]]
    row_name_to_id = {row.text: row.index for row in rows}
    assert len(row_name_to_id) == len(rows)
    remapping_forward = {}
    for sum_cat, names in remapping.items():
        for name in names:
            assert name not in remapping_forward, name
            remapping_forward[name] = sum_cat
    extra_in_remapping = set(remapping_forward) - set(row_name_to_id)
    assert not extra_in_remapping, extra_in_remapping
    extra_in_row_name_to_id = set(row_name_to_id) - set(remapping_forward)
    assert not extra_in_row_name_to_id, sorted(extra_in_row_name_to_id, key=lambda x: row_name_to_id[x])

    columns = [
        row_name_to_id[name]
        for name in remapping_forward
        if remapping_forward[name] != None
    ]
    table_raw = disaggregated_from_da(year, columns, disagg_universe)
    result = {}
    for sum_cat, names in remapping.items():
        if sum_cat is None:
            continue
        indices = [row_name_to_id[name] for name in names]
        result[sum_cat] = table_raw[indices].sum(axis=1)
    return pd.DataFrame(result)
