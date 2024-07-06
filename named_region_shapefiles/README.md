
# From Census site

Source: https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html

 - cb_2018_us_cbsa_500k.zip
 - cb_2018_us_csa_500k.zip
 - cb_2018_us_zcta510_500k.zip

Source: https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html

 - cb_2022_us_state_500k.zip
 - cb_2022_us_county_500k.zip
 - cb_2022_us_cousub_500k.zip
 - cb_2022_us_place_500k.zip
 - cb_2022_us_aiannh_500k.zip
 - cb_2022_us_aitsn_500k.zip
 - cb_2022_us_elsd_500k.zip
 - cb_2022_us_scsd_500k.zip
 - cb_2022_us_unsd_500k.zip

Source: https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.2015.html#list-tab-1556094155

 - cb_2015_us_county_500k.zip

# USDA

Source: https://www.ers.usda.gov/data-products/county-typology-codes/

 - 2015CountyTypologyCodes.csv

# From HIFLD

Source https://hifld-geoplatform.opendata.arcgis.com/datasets/geoplatform::us-district-court-jurisdictions/explore?location=31.251558%2C-88.409995%2C4.92&showTable=true

  - US_District_Court_Jurisdictions.zip

# From Zillow

Source: https://catalog.data.gov/dataset/neighborhoods-us-2017-zillow-segs
 - Zillow_Neighborhoods
 Download, unzip, then
 ```
 gpd.read_file("named_region_shapefiles/Zillow_Neighborhoods/ZillowNeighborhoods.gdb/", driver='FileGDB', layer=0).to_file("named_region_shapefiles/Zillow_Neighborhoods/zillow.shp")
 ```

# From FCC

Source: https://transition.fcc.gov/oet/info/maps/census/fips/fips.txt
  - county_map.txt

# From UCLA

Source: https://cdmaps.polisci.ucla.edu/; Version 1.5 (April 22, 2020)
  - 1-114th Congressional Districts, 115th-117th for districts that were not changed

# From Data Catalog

Source: https://catalog.data.gov/dataset/tiger-line-shapefile-2016-nation-u-s-115th-congressional-district-national
  - 115th Congressional Districts for 115th Congress in VA, FL, NC
Source: https://catalog.data.gov/dataset/tiger-line-shapefile-2019-nation-u-s-116th-congressional-district-national
  - 116th Congressional Districts for 116th Congress in PA

# From NC Legislature

Source: https://www.ncleg.gov/Redistricting/C2022C
  - 117th Congressional Districts for 117th Congress in NC

# From Kenneth C Black

Source: https://datablends.us/2021/01/14/a-useful-dma-shapefile-for-tableau-and-alteryx/

  - NatDMA.zip

# Hospital locations

Source: https://www.kaggle.com/datasets/carlosaguayo/usa-hospitals

  - features/hospitals.zip

# Airport locations

Source: https://hub.arcgis.com/datasets/esri-de-content::world-airports/about

  - features/world-airports.zip

# Superfund sites

Source: https://catalog.data.gov/dataset/u-s-epa-national-priorities-list-npl-sites-point-data-with-ciesin-modifications-version-2

  - features/epa-national-priorities-list-ciesin-mod-v2-2014.xls

# Schools

Source: https://hifld-geoplatform.opendata.arcgis.com/datasets/geoplatform::public-schools/about

    - features/Public_Schools.zip
  
# Countries

Source: https://public.opendatasoft.com/explore/dataset/world-administrative-boundaries/export/?flg=en-us&location=2,38.87069,0.00845&basemap=jawg.light

     - World_Countries_Generalized.zip

# Subnational regions

Source: https://hub.arcgis.com/datasets/esri::world-administrative-divisions/explore?location=41.502196%2C25.823236%2C6.69

      - World_Administrative_Divisions.zip

# Dartmouth Atlas

Source: https://data.dartmouthatlas.org/supplemental/#boundaries

  - HRR_Bdry__AK_HI_unmodified_original.geojson [hrr.geojson is derived from this, some small errors fixed]
  - HSA_Bdry__AK_HI_unmodified.geojson

# from GHSL

Source: https://human-settlement.emergency.copernicus.eu/ghs_stat_ucdb2015mt_r2019a.php
   - `GHS_STAT_UCDB2015MT_GLOBE_R2019A_V1_2.gpkg`

# From CDC

Source: https://chronicdata.cdc.gov/500-Cities-Places/PLACES-Local-Data-for-Better-Health-Census-Tract-D/cwsq-ngmh/about_data

    - `PLACES__Local_Data_for_Better_Health__Census_Tract_Data_2023_release_20240531.csv`

# From OpenDataSoft

Source: https://public.opendatasoft.com/explore/dataset/geonames-all-cities-with-a-population-1000/information/?flg=en-us&disjunctive.cou_name_en&sort=name&location=2,34.16182,-0.17578&basemap=jawg.light

    - `geonames-all-cities-with-a-population-1000.csv`