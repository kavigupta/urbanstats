# Dissemination block-level data

Download the 2016 Geographic Attribute File (GAF) CSV zip and use it as the
DB-level source for population and dwellings.
Suggested direct file: https://www12.statcan.gc.ca/census-recensement/2016/geo/ref/gaf/files-fichiers/2016_92-151_XBB_csv.zip

Place the zip at:

    named_region_shapefiles/canada_2016/2016_92-151_XBB_csv.zip

# Dissemination block boundaries

Download the 2016 DB digital boundary file (DBF):

    https://www12.statcan.gc.ca/census-recensement/2011/geo/bound-limit/files-fichiers/2016/ldb_000a16a_e.zip

Place the zip at:

    named_region_shapefiles/canada_2016/ldb_000a16a_e.zip

# Notes

These files are used by CensusCanada (population and density only). If any column names
in the GAF CSV differ (e.g., DBpop2016 or DBtdwell2016), update the mappings in
urbanstats/data/canada/canada_blocks.py accordingly.

# Optional download helper

You can use scripts/download_canada_census_year.py to fetch and unzip these files.
Verify the URLs if StatCan changes hosting.