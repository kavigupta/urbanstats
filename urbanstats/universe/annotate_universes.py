from functools import lru_cache
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


def attach_intl_universes(intl):
    intl["universes"] = [
        ["world"]
        + (["USA", longname.replace(" [SN]", "")] if longname.endswith(", USA") else [])
        for longname in intl.longname
    ]


@permacache("urbanstats/universe/annotate_universes/country_names")
def country_names():
    from shapefiles import shapefiles

    return list(shapefiles["countries"].load_file().longname)


@lru_cache(None)
def universe_by_universe_type():
    return {
        "world": ["world"],
        "country": ["USA"],
        "state": [
            x.name + ", USA" for x in us.states.STATES_AND_TERRITORIES + [us.states.DC]
        ],
    }


@lru_cache(None)
def all_universes():
    return [
        universe
        for universe_by_type in universe_by_universe_type().values()
        for universe in universe_by_type
    ]
