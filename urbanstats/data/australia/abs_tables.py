"""Read the ABS DataPack and collapse its cells into statistic columns.

The DataPack ships one CSV per table, keyed by SA1, with wide tables split across
A/B/C... parts.
"""

import os
import re
import zipfile

import pandas as pd
from permacache import permacache, stable_hash

SA1_CODE = "SA1_CODE_2021"
GCP_ZIP = os.path.join(
    "named_region_shapefiles",
    "australia",
    "data",
    "raw",
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


@permacache(
    "urbanstats/data/australia/abs_tables/sa1_table",
    key_function=dict(remapping=stable_hash),
)
def sa1_table(table, remapping):
    """One row per SA1; each output column is the sum of its list of short-header codes."""
    with zipfile.ZipFile(GCP_ZIP) as archive:
        frame = load_table(archive, table)
    return pd.DataFrame(
        {name: frame[codes].sum(axis=1) for name, codes in remapping.items()}
    )
