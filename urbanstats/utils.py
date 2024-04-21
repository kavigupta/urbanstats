from permacache import stable_hash

import numpy as np


def hash_full_table(sh):
    non_float_columns = [
        x for x in sh if sh[x].dtype != np.float64 and sh[x].dtype != np.float32
    ]
    # for c in sh:
    #     print(c, stable_hash(sh[c]))
    return stable_hash(
        (
            stable_hash([sh[x] for x in non_float_columns]),
            stable_hash(np.array([sh[x] for x in sh if x not in non_float_columns])),
            list(sh),
            non_float_columns,
        )
    )
