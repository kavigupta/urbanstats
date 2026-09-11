import numpy as np
from permacache import permacache, stable_hash
import tqdm.auto as tqdm


@permacache(
    "urbanstats/data/fun_facts/correlations/compute_all_correlations",
    key_function=dict(table_arr=stable_hash),
)
def compute_all_correlations(
    table_arr: np.ndarray, population: np.ndarray
) -> np.ndarray:
    assert table_arr.shape[0] == population.shape[0], "Mismatched number of rows"
    all_corr = []
    for c1 in tqdm.trange(table_arr.shape[1]):
        all_corr.append([])
        for c2 in range(table_arr.shape[1]):
            col1, col2 = table_arr[:, [c1, c2]].T
            mask = ~np.isnan(col1) & ~np.isnan(col2)
            all_corr[-1].append(
                weighted_correlation(col1[mask], col2[mask], population[mask])
            )
    return np.array(all_corr)


def weighted_correlation(x: np.ndarray, y: np.ndarray, weights: np.ndarray) -> float:
    weights = weights / np.sum(weights)

    def norm(arr: np.ndarray) -> np.ndarray:
        arr = arr - np.sum(weights * arr)
        return arr / np.sqrt(np.sum(weights * arr**2))

    x_norm = norm(x)
    y_norm = norm(y)

    return np.sum(weights * x_norm * y_norm)
