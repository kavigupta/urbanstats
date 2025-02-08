import os
import netCDF4
import numpy as np

root = "named_region_shapefiles/pollution"
annual_selected = root + "/Annual-selected/"
files = os.listdir(annual_selected)
sum_over_years = 0
latitudes = []
longitudes = []
for file in files:
    print(file)
    with netCDF4.Dataset(os.path.join(annual_selected, file), "r") as dset:
        sum_over_years += dset["PM25"][:].data
        latitudes.append(dset["lat"][:].data)
        longitudes.append(dset["lon"][:].data)
assert (np.array(latitudes) == latitudes[0]).all()
assert (np.array(longitudes) == longitudes[0]).all()

mean_over_years = sum_over_years / len(files)
np.savez_compressed(
    root + "/annual_mean.npz",
    mean_pollution=mean_over_years,
    latitudes=latitudes[0],
    longitudes=longitudes[0],
)
