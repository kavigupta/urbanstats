from typing import List

import attr
import pandas as pd
from permacache import permacache, stable_hash

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
    row_name_to_id, columns = compute_remapping(table_names, remapping)
    table_raw = disaggregated_from_da(year, columns, disagg_universe)
    result = {}
    for sum_cat, names in remapping.items():
        if sum_cat is None:
            continue
        indices = [row_name_to_id[name] for name in names]
        result[sum_cat] = table_raw[indices].sum(axis=1)
    return pd.DataFrame(result)


def compute_remapping(table_names, remapping):
    all_rows = metadata_by_table()
    rows = []
    for table_name in table_names:
        table_name, table_id = (
            table_name if isinstance(table_name, tuple) else (table_name, "")
        )
        for row in all_rows[table_name]:
            rows.append((row, table_id))
    row_name_to_id = {table_prefix + row.text: row.index for row, table_prefix in rows}
    assert len(row_name_to_id) == len(rows)
    remapping_forward = {}
    for sum_cat, names in remapping.items():
        for name in names:
            assert name not in remapping_forward, name
            remapping_forward[name] = sum_cat
    extra_in_remapping = set(remapping_forward) - set(row_name_to_id)
    assert not extra_in_remapping, extra_in_remapping
    extra_in_row_name_to_id = set(row_name_to_id) - set(remapping_forward)
    assert not extra_in_row_name_to_id, sorted(
        extra_in_row_name_to_id, key=lambda x: row_name_to_id[x]
    )

    columns = [
        row_name_to_id[name]
        for name, remap in remapping_forward.items()
        if remap is not None
    ]

    return row_name_to_id, columns
