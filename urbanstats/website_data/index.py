import json
import re
import unicodedata

from urbanstats.geometry.relationship import ordering_idx as type_ordering_idx
from urbanstats.geometry.relationship import type_to_type_category
from urbanstats.protobuf.utils import save_search_index
from urbanstats.special_cases.symlinks import symlinks

# maps types to their search priority scores, which must fit into an uint32. Higher=less important
type_category_to_priority = {
    "US Subdivision": 0,
    "International": 0,
    "Census": 2,
    "Small": 2,
    "Native": 2,
    "Political": 3,
    "School": 3,
    "Oddball": 4,
    "Kavi": 5,
}


def type_to_priority_list():
    result = [None] * len(type_ordering_idx)
    for typ, idx in type_ordering_idx.items():
        result[idx] = type_category_to_priority[type_to_type_category[typ]]
    assert None not in result
    return result


def export_index(full, site_folder):
    save_search_index(
        full.longname,
        full.type,
        # This is an elemntwise comparison, so it's actually needed
        # Clears out NaN values, treating them as False
        # pylint: disable=singleton-comparison
        full.subset_mask_USA == True,
        f"{site_folder}/index/pages_all.gz",
        symlinks=symlinks,
    )

    with open(f"{site_folder}/index/best_population_estimate.json", "w") as f:
        json.dump(list(full.best_population_estimate), f)


def normalize(s):
    # in javascript: return a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    s = s.lower()
    s = unicodedata.normalize("NFD", s)
    s = re.sub(r"[\u0300-\u036f]", "", s)
    return s
