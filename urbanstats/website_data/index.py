import json
import re
import unicodedata

from urbanstats.geometry.relationship import ordering_idx as type_ordering_idx
from urbanstats.geometry.relationship import type_to_type_category
from urbanstats.protobuf.utils import save_search_index
from urbanstats.special_cases.symlinks.compute_symlinks import compute_symlinks

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
        symlinks=compute_symlinks(),
    )

    with open(f"{site_folder}/index/best_population_estimate.json", "w") as f:
        json.dump(list(full.best_population_estimate), f)


def normalize(s):
    # in javascript: return a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    s = s.lower()
    s = unicodedata.normalize("NFD", s)
    s = re.sub(r"[\u0300-\u036f]", "", s)
    return s
