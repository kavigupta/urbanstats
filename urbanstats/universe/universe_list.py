from functools import lru_cache

import us

from urbanstats.universe.universe_constants import (
    CONTINENT_TO_SUB_UNIVERSES,
    CONTINENTS,
    COUNTRIES,
)

# universes that are assigned by default to articles. An article's default universe is the most specific universe that
# lies in the default_universes list.
default_universes = ["world", "USA", "Canada"]


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
def all_universes():
    return [
        universe
        for universe_by_type in universe_by_universe_type().values()
        for universe in universe_by_type
    ]


@lru_cache(None)
def continent_sub_universes():
    """
    Maps each continent to the set of universes strictly contained within it.
    """
    return {
        continent: set(sub_universes)
        for continent, sub_universes in CONTINENT_TO_SUB_UNIVERSES.items()
    }


def check_continent_sub_universes(contained_by, present_longnames):
    """
    Check CONTINENT_TO_SUB_UNIVERSES against the strict containment relationships it was
    derived from. Universes that do not appear as articles are skipped.

    :param contained_by: maps each longname to the set of longnames strictly containing it
    :param present_longnames: the longnames that appear as articles
    """
    universe_to_containing_continent = {}
    for continent, universes in CONTINENT_TO_SUB_UNIVERSES.items():
        for universe in universes:
            if universe in universe_to_containing_continent:
                raise ValueError(
                    f"Universe {universe} is listed as a sub-universe of both {universe_to_containing_continent[universe]} and {continent}"
                )
            universe_to_containing_continent[universe] = continent
    unknown = {
        universe
        for universes in CONTINENT_TO_SUB_UNIVERSES.values()
        for universe in universes
    } - set(all_universes())
    assert (
        not unknown
    ), f"Unknown universes in CONTINENT_TO_SUB_UNIVERSES: {sorted(unknown)}"

    errors = []
    for universe in all_universes():
        if universe in CONTINENTS or universe not in present_longnames:
            continue
        continents = contained_by.get(universe, set()) & set(CONTINENTS) - {universe}
        expected = {universe_to_containing_continent[universe]} if universe in universe_to_containing_continent else set()
        if continents != expected:
            errors.append(
                f"{universe} is contained by {continents}, but CONTINENT_TO_SUB_UNIVERSES says it should be contained by {universe_to_containing_continent[universe]}"
            )
    assert not errors, "CONTINENT_TO_SUB_UNIVERSES is out of date:\n" + "\n".join(
        errors
    )


def is_strict_sub_universe(sub_universe, super_universe):
    """
    Check if sub_universe is a strict sub-universe of super_universe.
    """
    if sub_universe == super_universe:
        return False
    if super_universe == "world":
        return True
    if super_universe in CONTINENTS:
        return sub_universe in continent_sub_universes()[super_universe]
    if super_universe in COUNTRIES:
        # This is a bit hacky but does work
        return sub_universe.split(", ")[-1] == super_universe
    return False
