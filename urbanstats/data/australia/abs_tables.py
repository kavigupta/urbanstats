"""Read the ABS DataPack and collapse its cells into statistic columns.

The DataPack ships one CSV per table, keyed by SA1, with wide tables split across
A/B/C... parts. Cells are summed per abs_cells.COLLAPSE, the way get_da_table does
for Canada, rather than being pre-collapsed in the data repository.
"""

import os
import re
import zipfile

import pandas as pd
from permacache import permacache

from urbanstats.data.australia.abs_cells import COLLAPSE

SA1_CODE = "SA1_CODE_2021"
GCP_ZIP = os.path.join(
    "named_region_shapefiles", "australia", "data", "raw",
    "2021_GCP_SA1_for_AUS_short-header.zip",
)


def table_parts(archive, table):
    pattern = re.compile(rf"2021Census_{table}[A-Z]?_AUST_SA1\.csv")
    names = sorted(
        n for n in archive.namelist() if pattern.fullmatch(os.path.basename(n))
    )
    assert names, f"no CSVs for {table} in {GCP_ZIP}"
    return names


def load_table(archive, table):
    parts = [
        pd.read_csv(archive.open(name)).set_index(SA1_CODE)
        for name in table_parts(archive, table)
    ]
    joined = pd.concat(parts, axis=1)
    assert not joined.columns.duplicated().any(), f"{table}: duplicate columns"
    return joined


@permacache("urbanstats/data/australia/abs_tables/sa1_statistics_2")
def sa1_statistics():
    """One row per SA1, one column per entry in COLLAPSE."""
    columns = {}
    index = None
    with zipfile.ZipFile(GCP_ZIP) as archive:
        for table, outputs in COLLAPSE.items():
            frame = load_table(archive, table)
            if index is None:
                index = frame.index
            assert frame.index.equals(index), f"{table}: SA1 index differs"
            for name, codes in outputs.items():
                assert name not in columns, f"duplicate output column {name}"
                columns[name] = frame[codes].sum(axis=1)
    return pd.DataFrame(columns, index=index)
