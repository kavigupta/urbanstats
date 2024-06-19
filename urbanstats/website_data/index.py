import json
import re
import unicodedata
from collections import defaultdict

from urbanstats.protobuf.utils import save_string_list


def export_index(full, site_folder):
    save_string_list(list(full.longname), f"{site_folder}/index/pages.gz")
    by_first_letter = defaultdict(list)
    for name in full.longname:
        normed = normalize(name[0])
        if not normed.isascii() or normed == "/":
            continue
        by_first_letter[normed].append(name)

    for letter, names in by_first_letter.items():
        save_string_list(names, f"{site_folder}/index/pages_{letter}.gz")

    with open(f"{site_folder}/index/best_population_estimate.json", "w") as f:
        json.dump(list(full.best_population_estimate), f)


def normalize(s):
    # in javascript: return a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    s = s.lower()
    s = unicodedata.normalize("NFD", s)
    s = re.sub(r"[\u0300-\u036f]", "", s)
    return s
