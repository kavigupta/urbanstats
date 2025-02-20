"""
The idea here is to allow for renaming longnames. To preserve old URLs, we add "symlinks"
written into a dictionary that map one to the other

This change is added to make the country renaming change work, and is completely adequate
for that change (which only changes 1983 names) but might not scale well in future
"""

from .symlinks_from_country_rename import symlinks_from_country_rename
from .symlinks_from_subnational_usa_fixes import symlinks_from_subnational_usa_fixes
from .symlinks_from_historical_congressional_rename import (
    symlinks_from_historical_congressional_rename,
)

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

done = False
while not done:
    done = True
    for k, v in symlinks.items():
        if v in symlinks:
            symlinks[k] = symlinks[v]
            done = False
