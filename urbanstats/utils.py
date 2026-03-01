import itertools
import json
import os
from dataclasses import dataclass
from typing import Any, cast

import numpy as np
import zarr


def compute_bins_slow(
    data: np.ndarray[Any, Any],
    weight: np.ndarray[Any, Any],
    *,
    bin_size: float = 0.1,
) -> list[Any]:
    max_value = float(data.max()) if len(data) > 0 else 0.0
    if max_value < 0:
        return [float(sum(weight))]
    idxs = np.arange(int(np.ceil(max_value / bin_size)) + 1)
    bins = idxs * bin_size

    def key_fn(idx: int, x: float) -> float:
        return cast(float, abs(bins[idx] - x))

    return [
        weight[[idx == min(idxs, key=lambda i: key_fn(i, x)) for x in data]].sum()
        for idx in range(len(bins))
    ]


def compute_bins(
    data: np.ndarray[Any, Any],
    weight: np.ndarray[Any, Any],
    *,
    bin_size: float = 0.1,
) -> np.ndarray[Any, Any]:
    """
    Compute a weighted histogram for a dataset.

    :returns: values
        values[idx] === weight[[idx == min(idxs, key=lambda idx: abs(bins[idx] - x)) for x in data]].sum()
    """
    max_value = data.max() if len(data) > 0 else 0
    if max_value < 0:
        return cast(np.ndarray[Any, Any], np.sum(weight)[None])
    values: np.ndarray[Any, Any] = np.zeros(
        int(np.ceil(max_value / bin_size)) + 1, dtype=weight.dtype
    )
    idx = (data / bin_size + 0.5).astype(np.int32)
    idx = np.clip(idx, 0, len(values) - 1)
    np.add.at(values, idx, weight)
    return values


def output_typescript(data: object, file: Any, data_type: str = "const") -> None:
    content = json.dumps(data, indent=4)
    if data_type == "const":
        file.write(f"export default {content} as const")
    else:
        file.write(f"const value: {data_type} = {content}\nexport default value")


@dataclass
class DiscreteDistribution:
    cumulative_dist: np.ndarray[Any, Any]

    def __post_init__(self) -> None:
        assert np.allclose(self.cumulative_dist[-1], 1)

    @classmethod
    def of(cls, weights: np.ndarray[Any, Any]) -> "DiscreteDistribution":
        pcumu = np.cumsum(weights)
        pcumu = pcumu / pcumu[-1]
        return cls(pcumu)

    def sample(self, rng: Any, *args: Any) -> np.ndarray[Any, Any]:
        r = rng.random(*args)
        result: np.ndarray[Any, Any] = np.searchsorted(
            self.cumulative_dist, r, side="left"
        )
        return result


def cached_zarr_array(path: str, create_fn: Any) -> Any:
    if not os.path.exists(path):
        result = create_fn()
        with zarr.open(path, mode="w") as z:
            z.create_dataset("data", data=result)
    return zarr.open(path, mode="r")["data"]


def to_cardinal_direction(angle_revolutions: float) -> str:
    return {
        0: "East",
        0.25: "North",
        0.5: "West",
        0.75: "South",
        0.125: "Northeast",
        0.375: "Northwest",
        0.625: "Southwest",
        0.875: "Southeast",
        0.0625: "East-Northeast",
        0.1875: "North-Northeast",
        0.3125: "North-Northwest",
        0.4375: "West-Northwest",
        0.5625: "West-Southwest",
        0.6875: "South-Southwest",
        0.8125: "South-Southeast",
        0.9375: "East-Southeast",
    }[angle_revolutions]


def name_points_around_center(centroids: Any) -> list[str]:
    centroids = np.array([centroids.x.values, centroids.y.values]).T
    centroids = centroids - centroids.mean(axis=0)
    angles = np.arctan2(centroids[:, 1], centroids[:, 0])
    fractions_of_circle = (angles / (2 * np.pi)) % 1
    centroids = centroids - centroids.mean(axis=0)
    for log_subdivisions in itertools.count(2):
        subdivisions = 2**log_subdivisions
        rounded_fractions = np.round(fractions_of_circle * subdivisions) / subdivisions
        rounded_fractions %= 1
        if len(set(rounded_fractions)) == len(rounded_fractions):
            return [to_cardinal_direction(fraction) for fraction in rounded_fractions]
    raise RuntimeError("unreachable")


def approximate_quantile(
    bins: np.ndarray[Any, Any],
    weights: np.ndarray[Any, Any],
    q: float,
) -> float:
    """
    Approximate the qth quantile of a distribution given by bins and weights.
    In essence, weights[i] applies to the bin bins[i] to bins[i+1], and is treated
    as being uniformly distributed in that range.
    """
    assert 0 <= q <= 1
    assert len(bins) == len(weights) + 1
    weights = np.array(weights) / np.sum(weights)
    cumulative = np.cumsum(weights)
    idx = np.searchsorted(cumulative, q, side="right")
    if idx == len(weights):
        return float(bins[-1])
    prev_cumu = cumulative[idx - 1] if idx > 0 else 0
    next_cumu = cumulative[idx]
    prev_bin = bins[idx]
    next_bin = bins[idx + 1]
    frac = (q - prev_cumu) / (next_cumu - prev_cumu)
    return float(prev_bin + frac * (next_bin - prev_bin))
