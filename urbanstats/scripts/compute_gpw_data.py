from urbanstats.data.gpw import compute_gpw_data_for_shapefile_table
from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles

ys = [y for x, y in shapefiles.items() if y.include_in_gpw]
for y in ys:
    compute_gpw_data_for_shapefile_table(y)
