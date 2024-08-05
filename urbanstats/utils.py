import numpy as np
import shapely
from permacache import stable_hash


def hash_full_table(sh):
    non_float_columns = [
        x for x in sh if sh[x].dtype != np.float64 and sh[x].dtype != np.float32
    ]
    return stable_hash(
        (
            stable_hash([sh[x] for x in non_float_columns]),
            stable_hash(np.array([sh[x] for x in sh if x not in non_float_columns])),
            list(sh),
            non_float_columns,
        )
    )
