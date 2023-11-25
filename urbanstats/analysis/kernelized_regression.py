from permacache import permacache
import numpy as np
from create_website import add_margins
from produce_html_page import internal_statistic_names
from stats_for_shapefile import block_level_data, process_summed_statistics, sum_keys

_original_names = [
    x for x in internal_statistic_names() if x not in ["sd", "area", "compactness"]
]

internal_names = ["intercept"] + _original_names


def compute_kernel(summed_data):
    """Compute the kernel matrix, as well as the "units" for each variable."""
    out = process_summed_statistics(summed_data.copy())
    add_margins(out)
    out["housing_per_pop"] = np.clip(out["housing_per_pop"], 0, 10)
    out = out[~np.isnan(out[("2016-2020 Swing", "margin")])]
    out = out.loc[:, _original_names].copy()
    weight = np.array(out["population"])
    weight = weight / weight.sum()
    out = np.concatenate([np.ones((out.shape[0], 1)), out], axis=1)
    data = np.nan_to_num(np.array(out), 0)
    units = data.mean(0)
    data = data / units
    kernel = data.T @ (weight[:, None] * data)
    return kernel, units


@permacache("urbanstats/analysis/kernelized_regression/block_level_kernel")
def block_level_kernel(sum_keys=sum_keys, internal_names=internal_names):
    """Compute the kernel matrix for block level data."""
    del sum_keys, internal_names
    summed_data = block_level_data()
    return compute_kernel(summed_data)


@permacache("urbanstats/analysis/kernelized_regression/tract_level_kernel")
def tract_level_kernel(sum_keys=sum_keys, internal_names=internal_names):
    """Compute the kernel matrix for tract level data."""
    del internal_names
    bld = block_level_data()
    tract = bld.geoid.apply(lambda x: x[: len("7500000US") + 2 + 3 + 6])
    summed = bld[sum_keys].groupby(tract).sum()
    return compute_kernel(summed)

def regress(kernel, units, input_cols, output_col, w_intercept=True):
    if w_intercept:
        input_cols = ["intercept"] + input_cols
    input_cols = [internal_names.index(c) for c in input_cols]
    output_col = internal_names.index(output_col)
    ATA = kernel[input_cols][:,input_cols]
    ATb = kernel[input_cols, [output_col]]
    beta = np.linalg.solve(ATA, ATb)
    beta /= units[input_cols]
    beta *= units[output_col]
    return beta