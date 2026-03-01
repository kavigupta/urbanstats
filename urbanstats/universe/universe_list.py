from functools import lru_cache

import us
from us.states import State

from urbanstats.universe.universe_constants import CONTINENTS, COUNTRIES

# universes that are assigned by default to articles. An article's default universe is the most specific universe that
# lies in the default_universes list.
default_universes = ["world", "USA", "Canada"]


def get_universe_name_for_state(state: State) -> str:
    assert state is not None
    name: str = state.name
    if name == "Virgin Islands":
        name = "US Virgin Islands"
    return name + ", USA"


@lru_cache(None)
def universe_by_universe_type() -> dict[str, list[str]]:
    return {
        "world": ["world"],
        "continent": CONTINENTS,
        "country": COUNTRIES,
        "state": [
            get_universe_name_for_state(x) for x in us.states.STATES_AND_TERRITORIES
        ],
        "province": [
            "Alberta, Canada",
            "British Columbia, Canada",
            "Manitoba, Canada",
            "New Brunswick, Canada",
            "Newfoundland and Labrador, Canada",
            "Northwest Territories, Canada",
            "Nova Scotia, Canada",
            "Nunavut, Canada",
            "Ontario, Canada",
            "Prince Edward Island, Canada",
            "Quebec, Canada",
            "Saskatchewan, Canada",
            "Yukon, Canada",
        ],
    }


@lru_cache(None)
def all_universes() -> list[str]:
    return [
        universe
        for universe_by_type in universe_by_universe_type().values()
        for universe in universe_by_type
    ]
