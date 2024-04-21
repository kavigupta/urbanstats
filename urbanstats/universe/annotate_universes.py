from functools import lru_cache
import us


universe_types = ["world", "country", "state"]


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
