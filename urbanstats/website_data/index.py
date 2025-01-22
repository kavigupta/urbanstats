import json
import re
import unicodedata

from urbanstats.geometry.relationship import type_to_type_category
from urbanstats.protobuf.utils import save_search_index, save_string_list

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


def export_index(full, site_folder):
    save_string_list(list(full.longname), f"{site_folder}/index/pages.gz")

    elements_list = list()
    for name, typ in zip(full.longname, full.type):
        priority = type_category_to_priority[type_to_type_category[typ]]
        normed = normalize(name[0])
        if not normed.isascii() or normed == "/":
            continue
        entry = (name, priority)
        elements_list.append(entry)

    save_search_index(elements_list, f"{site_folder}/index/search.gz")

    with open(f"{site_folder}/index/best_population_estimate.json", "w") as f:
        json.dump(list(full.best_population_estimate), f)


def normalize(s):
    # in javascript: return a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    s = s.lower()
    s = unicodedata.normalize("NFD", s)
    s = re.sub(r"[\u0300-\u036f]", "", s)
    return s
