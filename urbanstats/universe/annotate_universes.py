import re

import us
from permacache import permacache

from urbanstats.data.circle import pc_types
from urbanstats.geometry.relationship import (
    continents_for_all,
    non_us_countries_for_all,
    states_for_all,
)
from urbanstats.geometry.shapefiles.shapefiles.countries import (
    COUNTRIES as COUNTRIES_SHAPEFILE,
)
from urbanstats.special_cases.country import continent_names
from urbanstats.universe.universe_list import get_universe_name_for_state
from urbanstats.universe.universe_provider.compute_universes import (
    compute_universes_for_shapefile,
)

from .universe_constants import CONTINENTS, COUNTRIES


def attach_usa_universes(american):
    states_map = states_for_all()
    american["universes"] = [
        ["world", "North America", "USA"] + sorted(states_map[longname])
        for longname in american.longname
    ]



def attach_intl_universes(intl):
    assert country_names() == COUNTRIES
    assert list(continent_names()) == CONTINENTS
    from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles

    resulting = {}
    for shapefile in shapefiles.values():
        if shapefile.universe_provider is not None:
            resulting.update(compute_universes_for_shapefile(shapefiles, shapefile))

    intl["universes"] = [resulting[longname] for longname in intl.longname]


@permacache("urbanstats/universe/annotate_universes/country_names_3")
def country_names():
    return list(COUNTRIES_SHAPEFILE.load_file().longname)
