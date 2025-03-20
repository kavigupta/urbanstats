"""
The idea here is to allow for renaming longnames. To preserve old URLs, we add "symlinks"
written into a dictionary that map one to the other
"""

from functools import lru_cache

from urbanstats.website_data.table import shapefile_without_ordinals
from .symlinks_from_country_rename import symlinks_from_country_rename
from .symlinks_from_historical_congressional_rename import (
    symlinks_from_historical_congressional_rename,
)
from .symlinks_from_subnational_usa_fixes import symlinks_from_subnational_usa_fixes


def symlinks_most_recent_year():
    table = shapefile_without_ordinals()
    table = table[table.longname != table.longname_sans_date]
    return dict(zip(table.longname_sans_date, table.longname))


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
    symlinks.update(symlinks_most_recent_year())

    for k in symlinks:
        assert k not in real_names, k
        while symlinks[k] in symlinks:
            symlinks[k] = symlinks[symlinks[k]]
        assert symlinks[k] in real_names, (k, symlinks[k])

    return symlinks
