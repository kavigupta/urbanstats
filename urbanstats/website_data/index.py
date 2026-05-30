import json
import re
import unicodedata

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


def type_to_priority_list():
    result = [None] * len(type_ordering_idx)
    for typ, idx in type_ordering_idx.items():
        result[idx] = type_category_to_priority[type_to_type_category[typ]]
    assert None not in result
    return result


def export_index(full, site_folder):
    utoi = universe_to_idx()
    longname_to_universes = dict(zip(full.longname, full.universes))
    universe_idxs_list = [
        [utoi[u] for u in longname_to_universes[ln] if u in utoi]
        for ln in full.longname
    ]
    save_search_index(
        full.longname,
        full.type,
        universe_idxs_list,
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
