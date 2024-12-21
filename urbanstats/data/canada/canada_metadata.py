from dataclasses import dataclass
from functools import lru_cache


@dataclass
class MetadataRow:
    index: int
    text: str


@lru_cache(None)
def canadian_metadata_columns():
    with open(
        "named_region_shapefiles/canada/98-401-X2021006_English_meta.txt",
        encoding="latin-1",
    ) as f:
        metadata = list(f)
    metadata = [x.strip("\n") for x in metadata]
    metadata = metadata[metadata.index("Member") + 1 :]
    metadata = metadata[: metadata.index("")]
    assert len(metadata) == 2631
    metadata = [x[x.index("\t") + 1 :] for x in metadata]
    return [MetadataRow(i, text) for i, text in enumerate(metadata, 1)]


def metadata_by_table():
    metadata = canadian_metadata_columns()
    tables = {}
    current_row = None
    for row in metadata:
        if row.text.startswith(" "):
            current_row.append(row)
        else:
            current_row = [row]
            tables[row.text] = current_row
    return tables
