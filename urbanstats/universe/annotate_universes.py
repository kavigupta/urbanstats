import re
from functools import lru_cache

import us
from permacache import permacache

from relationship import continents_for_all, non_us_countries_for_all, states_for_all
from urbanstats.data.circle import pc_types
from urbanstats.special_cases.country import continent_names

from .universe_constants import CONTINENTS, COUNTRIES

universe_types = ["world", "country", "state"]


def attach_usa_universes(american):
    states_map = states_for_all()
    american["universes"] = [
        ["world", "North America", "USA"] + sorted(states_map[longname])
        for longname in american.longname
    ]


subnation_usa = re.compile(r"(?!([ ,-]))(?P<state>[^,\-\s][^,\-]*), USA")


def compute_intl_universes(longname, long_to_type):
    # can intersect the US but we don't want to add state universes
    usa_but_no_states = long_to_type[longname] in pc_types
    result = ["world"] + continents_for_all()[longname]
    if longname in continent_names():
        return result
    result += non_us_countries_for_all()[longname]
    if "USA" not in longname:
        return result
    if "USA" not in result:
        result += ["USA"]
    if longname == "USA":
        return result
    from urbanstats.special_cases.ghsl_urban_center import (
        gsl_urban_center_longname_to_subnational_codes,
    )

    if longname in gsl_urban_center_longname_to_subnational_codes():
        codes = gsl_urban_center_longname_to_subnational_codes()[longname]
        codes = [code[2:] for code in codes if code.startswith("US")]
        codes = [get_universe_name_for_state(us.states.lookup(code)) for code in codes]
        result += codes
        return result

    if usa_but_no_states:
        return result

    assert subnation_usa.match(longname), longname
    return result + [longname]


def attach_intl_universes(intl):
    assert country_names() == COUNTRIES
    assert list(continent_names()) == CONTINENTS
    long_to_type = dict(zip(intl.longname, intl.type))
    intl["universes"] = [
        compute_intl_universes(longname, long_to_type) for longname in intl.longname
    ]


@permacache("urbanstats/universe/annotate_universes/country_names_3")
def country_names():
    from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
    # TODO update references

    return list(shapefiles["countries"].load_file().longname)


def get_universe_name_for_state(state):
    name = state.name
    if name == "Virgin Islands":
        name = "US Virgin Islands"
    return name + ", USA"


@lru_cache(None)
def universe_by_universe_type():
    return {
        "world": ["world"],
        "continent": CONTINENTS,
        "country": COUNTRIES,
        "state": [
            get_universe_name_for_state(x)
            for x in us.states.STATES_AND_TERRITORIES + [us.states.DC]
        ],
    }


@lru_cache(None)
def all_universes():
    return [
        universe
        for universe_by_type in universe_by_universe_type().values()
        for universe in universe_by_type
    ]
