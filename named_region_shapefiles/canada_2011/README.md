# Dissemination block-level data

Download the 2011 Geographic Attribute File (GAF) XLSX zip and use it as the
DB-level source for population and dwellings.
Suggested direct file: https://www12.statcan.gc.ca/census-recensement/2011/geo/ref/files-fichiers/2011_92-151_XBB_xlsx.zip

Place the zip at:

    named_region_shapefiles/canada_2011/2011_92-151_XBB_xlsx.zip

# Dissemination block boundaries

Download the 2011 DB digital boundary file (DBF):

    https://www12.statcan.gc.ca/census-recensement/2011/geo/bound-limit/files-fichiers/gdb_000a11a_e.zip

Place the zip at:

    named_region_shapefiles/canada_2011/gdb_000a11a_e.zip

# Notes

These files are used by CensusCanada (population and density only). If any column names
in the GAF XLSX differ, update the mappings in
urbanstats/data/canada/canada_blocks.py accordingly.

# Optional download helper

You can use scripts/download_canada_census_year.py to fetch and unzip these files.
Verify the URLs if StatCan changes hosting.