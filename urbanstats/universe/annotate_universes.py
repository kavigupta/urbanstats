import re

import us
from permacache import permacache

from urbanstats.geometry.shapefiles.shapefiles.countries import (
    COUNTRIES as COUNTRIES_SHAPEFILE,
)
from urbanstats.special_cases.country import continent_names
from urbanstats.universe.universe_provider.compute_universes import (
    compute_universes_for_shapefile,
)

from .universe_constants import CONTINENTS, COUNTRIES



def attach_intl_universes(intl):
    assert country_names() == COUNTRIES
    assert list(continent_names()) == CONTINENTS
    from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles

    resulting = {}
    for shapefile in shapefiles.values():
        resulting.update(compute_universes_for_shapefile(shapefiles, shapefile))

    intl["universes"] = [resulting[longname] for longname in intl.longname]


@permacache("urbanstats/universe/annotate_universes/country_names_3")
def country_names():
    return list(COUNTRIES_SHAPEFILE.load_file().longname)
