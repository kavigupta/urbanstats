import json
import re
import unicodedata
from typing import Any, List

from urbanstats.geometry.relationship import full_relationships
from urbanstats.geometry.relationship import ordering_idx as type_ordering_idx
from urbanstats.geometry.relationship import type_to_type_category
from urbanstats.protobuf.utils import save_search_index
from urbanstats.special_cases.symlinks.compute_symlinks import compute_symlinks
from urbanstats.website_data.create_article_gzips import universe_to_idx

# maps types to their search priority scores. Higher=less important.
type_category_to_priority = {
    "International": 0,
    "US City": 0,
    "US Subdivision": 1,
    "International City": 2,
    "Census": 3,
    "Small": 4,
    "Native": 4,
    "Political": 5,
    "School": 5,
    "Oddball": 6,
    "Kavi": 7,
}


def type_to_priority_list() -> List[int]:
    result: List[Any] = [None] * len(type_ordering_idx)
    for typ, idx in type_ordering_idx.items():
        result[idx] = type_category_to_priority[type_to_type_category[typ]]
    assert None not in result
    return result


def export_index(full: Any, site_folder: str) -> None:
    save_search_index(
        full.longname,
        full.type,
        containing_universe_idxs(full),
        f"{site_folder}/index/pages_all.gz",
        symlinks=compute_symlinks(),
    )

    with open(f"{site_folder}/index/best_population_estimate.json", "w") as f:
        json.dump(list(full.best_population_estimate), f)


def containing_universe_idxs(full: Any) -> List[List[int]]:
    """
    Returns the list of universe indices for each geography, used for jumping to a random geography
    within a universe. Only includes universes that fully contain the geography — a geography that
    merely intersects a universe boundary should not be reachable by a random jump in that universe.
    """
    utoi = universe_to_idx()
    long_to_type = dict(zip(full.longname, full.type))
    longname_to_universes = dict(zip(full.longname, full.universes))

    rels = full_relationships(long_to_type)
    contained_by = {k: set(vs) for k, vs in rels["contained_by"].items()}
    same_geography = {k: set(vs) for k, vs in rels["same_geography"].items()}
    full_longnames_set = set(full.longname)

    return [
        [
            utoi[u]
            for u in longname_to_universes[ln]
            if (
                u
                not in full_longnames_set  # e.g. "world" — not a geographic entity, can't check containment
                # self-universe: geography is always in its own universe.
                # This gets filtered out in the random jumping case, but might be useful elsewhere
                or u == ln
                or u in contained_by.get(ln, set())
                or u
                in same_geography.get(
                    ln, set()
                )  # different shapefiles representing the same area
            )
        ]
        for ln in full.longname
    ]


def normalize(s: str) -> str:
    # in javascript: return a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    s = s.lower()
    s = unicodedata.normalize("NFD", s)
    s = re.sub(r"[\u0300-\u036f]", "", s)
    return s
