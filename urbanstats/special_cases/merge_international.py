from collections import Counter

import numpy as np
import pandas as pd

def merge_international_and_domestic(full):
    del full["type_category"]
    popu = np.array(full.population)
    popu[np.isnan(popu)] = full.gpw_population[np.isnan(popu)]
    full["best_population_estimate"] = popu
    full = full.sort_values("longname")
    full = full.sort_values("best_population_estimate", ascending=False, kind="stable")
    full = full[full.best_population_estimate > 0].reset_index(drop=True)
    counted = Counter(full.longname)
    duplicates = [name for name, count in counted.items() if count > 1]
    assert not duplicates, f"Duplicate names: {duplicates}"
    return full
