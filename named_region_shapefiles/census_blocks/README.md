# US Census Blocks Shapefile Download

This directory contains scripts to download the full US Census block shapefiles from the Census Bureau's TIGER/Line files.

## Usage

### Basic Usage

Download census block shapefiles for the default year (2020):

```bash
python download.py
```

### Options

- `--year YEAR`: Specify the census year (default: 2020)
- `--national-only`: Only attempt to download a national file, skip state-by-state downloads

### Examples

Download 2020 census blocks:
```bash
python download.py --year 2020
```

Download only national file if available:
```bash
python download.py --national-only
```

## How It Works

1. **National File Attempt**: The script first tries to download a national census block shapefile (if available for the specified year).

2. **State-by-State Download**: If no national file is available, it downloads shapefiles for each state individually from the Census Bureau's TIGER/Line files.

## Output

Downloaded files are stored in the `shapefiles/` subdirectory:
- Individual state files: `tl_{year}_{fips}_tabblock20.zip`
- National file (if available): `tl_{year}_us_tabblock20.zip`

## Requirements

- Python 3.6+
- `requests`
- `tqdm`
- `us` (Python US state metadata library)

Install dependencies:
```bash
pip install requests tqdm us
```

## Data Source

Shapefiles are downloaded from the US Census Bureau's TIGER/Line Shapefiles:
- Base URL: `https://www2.census.gov/geo/tiger/TIGER{year}/TABBLOCK20/`
- Documentation: https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html

## Notes

- Census block shapefiles are large (several GB when combined)
- Download time depends on your internet connection
- The script skips files that already exist locally
- State FIPS codes are used to identify state-specific files

