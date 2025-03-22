"""
The idea here is to allow for renaming longnames. To preserve old URLs, we add "symlinks"
written into a dictionary that map one to the other
"""

from functools import lru_cache

from urbanstats.website_data.table import shapefile_without_ordinals

from .symlinks_from_country_rename import symlinks_from_country_rename
from .symlinks_from_district_rename import symlinks_from_district_rename
from .symlinks_from_historical_congressional_rename import (
    symlinks_from_historical_congressional_rename,
)
from .symlinks_from_subnational_usa_fixes import symlinks_from_subnational_usa_fixes


def symlinks_most_recent_year():
    table = shapefile_without_ordinals()
    table = table[table.longname_sans_date != table.longname]
    sans_date_to_last_start_date = (
        table[["longname_sans_date", "start_date"]].groupby("longname_sans_date").max()
    )
    sans_date_to_last_start_date = dict(
        zip(sans_date_to_last_start_date.index, sans_date_to_last_start_date.start_date)
    )
    table = table[
        table.start_date
        == table.longname_sans_date.apply(sans_date_to_last_start_date.get)
    ]
    sans_date_to_longname = dict(zip(table.longname_sans_date, table.longname))
    assert table.shape[0] == len(sans_date_to_longname)
    return sans_date_to_longname

@lru_cache(None)
def compute_symlinks():
    real_names = set(shapefile_without_ordinals().longname)
    symlinks = {}

    symlinks.update(
        # Just for testing purposes. Harmless, but unnecessary
        {
            "United States of America": "USA",
        }
    )

    symlinks.update(symlinks_from_country_rename)
    symlinks.update(symlinks_from_subnational_usa_fixes)
    symlinks.update(symlinks_from_historical_congressional_rename)
    symlinks.update(symlinks_from_district_rename)
    symlinks.update(symlinks_most_recent_year())

    # pylint: disable=consider-using-dict-items
    for k in symlinks:
        assert k not in real_names, k
        while symlinks[k] in symlinks:
            symlinks[k] = symlinks[symlinks[k]]
        assert symlinks[k] in real_names, (k, symlinks[k])

    return symlinks
