from functools import lru_cache
import re
from permacache import permacache
import us

from relationship import states_for_all

universe_types = ["world", "country", "state"]


def attach_usa_universes(american):
    states_map = states_for_all()
    american["universes"] = [
        ["world", "USA"] + sorted(states_map[longname])
        for longname in american.longname
    ]

subnation_usa = re.compile(r"(?!([ ,-]))(?P<state>[^,\-\s][^,\-]*), USA")

def compute_intl_universes(longname):
    result = ["world"]
    if not longname.endswith("USA"):
        return result
    result += ["USA"]
    if longname == "USA":
        return result
    from urbanstats.special_cases.ghsl_urban_center import gsl_urban_center_longname_to_subnational_codes
    if longname in gsl_urban_center_longname_to_subnational_codes():
        codes = gsl_urban_center_longname_to_subnational_codes()[longname]
        codes = [code[2:] for code in codes if code.startswith("US")]
        codes = [
            get_universe_name_for_state(
                us.states.lookup(code)
            )
            for code in codes
        ]
        result += codes
        return result
    assert subnation_usa.match(longname), longname
    return result + [longname]


def attach_intl_universes(intl):
    intl["universes"] = [
        compute_intl_universes(longname)
        for longname in intl.longname
    ]


@permacache("urbanstats/universe/annotate_universes/country_names")
def country_names():
    from shapefiles import shapefiles

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
        "country": ["USA"],
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
