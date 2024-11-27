import numpy as np

import tqdm.auto as tqdm
from permacache import permacache
from netCDF4 import Dataset

from urbanstats.data.gpw import compute_gpw_weighted_for_shape, load_full_ghs_2015


@permacache("urbanstats/data/gdp_hdi/load_gridded_gdp_2")
def load_gridded_gdp():
    f = Dataset("named_region_shapefiles/gridded-gdp-hdi/GDP_PPP_30arcsec_v3.nc", "r")
    result = np.array(f["GDP_PPP"][-1])
    result[result < 0] = 0
    return result


@permacache("urbanstats/data/gdp_hdi/load_gridded_hdi_2")
def load_gridded_hdi():
    f = Dataset("named_region_shapefiles/gridded-gdp-hdi/HDI_1990_2015_v2.nc", "r")
    result = np.array(f["HDI"][-1])
    result[result < 0] = 0
    result = result[:, None, :, None].repeat(10, axis=1).repeat(10, axis=3)
    result = result.reshape(result.shape[0] * 10, result.shape[2] * 10)
    return result


@permacache(
    "urbanstats/data/gdp_hdi/compute_gridded_gdp_for_shapefile",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_gridded_gdp_for_shapefile(shapefile):
    pop_2015 = load_full_ghs_2015()
    ggdp = load_gridded_gdp()
    table = shapefile.load_file()
    results = []
    for sh in tqdm.tqdm(table.geometry):
        res, _ = compute_gpw_weighted_for_shape(
            sh,
            pop_2015,
            {"gdp": (ggdp, False), "pop": (pop_2015, False)},
            do_histograms=False,
        )
        results.append(res["gdp"] / res["pop"])
    return results
