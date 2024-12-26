from dataclasses import dataclass
import json

import numpy as np
from permacache import stable_hash


def hash_full_table(sh):
    non_float_columns = [x for x in sh if sh[x].dtype not in {np.float64, np.float32}]
    return stable_hash(
        (
            stable_hash([sh[x] for x in non_float_columns]),
            stable_hash(np.array([sh[x] for x in sh if x not in non_float_columns])),
            list(sh),
            non_float_columns,
        )
    )


def compute_bins_slow(data, weight, *, bin_size=0.1):
    max_value = data.max() if len(data) > 0 else 0
    if max_value < 0:
        return [sum(weight)]
    idxs = np.arange(int(np.ceil(max_value / bin_size)) + 1)
    bins = idxs * bin_size
    return [
        weight[
            [idx == min(idxs, key=lambda idx, x=x: abs(bins[idx] - x)) for x in data]
        ].sum()
        for idx in range(len(bins))
    ]


def compute_bins(data, weight, *, bin_size=0.1):
    """
    Compute a weighted histogram for a dataset.

    :returns: values
        values[idx] === weight[[idx == min(idxs, key=lambda idx: abs(bins[idx] - x)) for x in data]].sum()
    """
    max_value = data.max() if len(data) > 0 else 0
    if max_value < 0:
        return np.sum(weight)[None]
    values = np.zeros(int(np.ceil(max_value / bin_size)) + 1, dtype=weight.dtype)
    idx = (data / bin_size + 0.5).astype(np.int32)
    idx = np.clip(idx, 0, len(values) - 1)
    np.add.at(values, idx, weight)
    return values


def output_typescript(data, file, data_type="const"):
    content = json.dumps(data, indent=4)
    if data_type == "const":
        file.write(f"export default {content} as const")
    else:
        file.write(f"const value: {data_type} = {content}\nexport default value")


@dataclass
class DiscreteDistribution:
    cumulative_dist: np.ndarray

    def __post_init__(self):
        assert np.allclose(self.cumulative_dist[-1], 1)

    @classmethod
    def of(cls, weights):
        pcumu = np.cumsum(weights)
        pcumu = pcumu / pcumu[-1]
        return cls(pcumu)

    def sample(self, rng, *args):
        r = rng.rand(*args)
        return np.searchsorted(self.cumulative_dist, r, side="left")
