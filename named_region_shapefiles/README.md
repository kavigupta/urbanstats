
# From Census site

Source: https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html

 - cb_2018_us_state_500k.zip
 - cb_2018_us_county_500k.zip
 - cb_2018_us_cbsa_500k.zip
 - cb_2018_us_csa_500k.zip
 - cb_2018_us_zcta510_500k.zip

Source: https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html

 - cb_2022_us_cousub_500k.zip

Source: https://www.census.gov/cgi-bin/geo/shapefiles/index.php

 - place/*

# From Zillow

Source: https://catalog.data.gov/dataset/neighborhoods-us-2017-zillow-segs
 - Zillow_Neighborhoods
 Download, unzip, then
 ```
 gpd.read_file("named_region_shapefiles/Zillow_Neighborhoods/ZillowNeighborhoods.gdb/", driver='FileGDB', layer=0).to_file("named_region_shapefiles/Zillow_Neighborhoods/zillow.shp")
 ```
