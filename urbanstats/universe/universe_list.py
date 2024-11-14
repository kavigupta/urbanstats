from functools import lru_cache

import us

from urbanstats.universe.universe_constants import CONTINENTS, COUNTRIES

# universes that are assigned by default to articles. An article's default universe is the most specific universe that
# lies in the default_universes list.
default_universes = ["world", "USA"]


def get_universe_name_for_state(state):
    assert state is not None
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
            get_universe_name_for_state(x) for x in us.states.STATES_AND_TERRITORIES
        ],
    }


@lru_cache(None)
def all_universes():
    return [
        universe
        for universe_by_type in universe_by_universe_type().values()
        for universe in universe_by_type
    ]
