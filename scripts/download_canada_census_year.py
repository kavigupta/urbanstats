#!/usr/bin/env python3
import argparse
import pathlib
import shutil
import sys
import urllib.request
import zipfile

BASE_DIR = pathlib.Path("named_region_shapefiles")

URLS_BY_YEAR = {
    2016: {
        "geosuite_zip": "https://www12.statcan.gc.ca/census-recensement/2016/geo/ref/gaf/files-fichiers/2016_92-151_XBB_csv.zip",
        "db_boundary_zip": "https://www12.statcan.gc.ca/census-recensement/2011/geo/bound-limit/files-fichiers/2016/ldb_000a16a_e.zip",
    },
    2011: {
        "geosuite_zip": "https://www12.statcan.gc.ca/census-recensement/2011/geo/ref/files-fichiers/2011_92-151_XBB_xlsx.zip",
        "db_boundary_zip": "https://www12.statcan.gc.ca/census-recensement/2011/geo/bound-limit/files-fichiers/gdb_000a11a_e.zip",
    },
}


def download(url: str, dest: pathlib.Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        return
    with urllib.request.urlopen(url) as response, open(dest, "wb") as f:
        shutil.copyfileobj(response, f)


def extract_zip(zip_path: pathlib.Path, dest_dir: pathlib.Path) -> None:
    if not zip_path.exists():
        raise FileNotFoundError(zip_path)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(dest_dir)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("year", type=int, choices=sorted(URLS_BY_YEAR))
    parser.add_argument(
        "--no-extract", action="store_true", help="Only download, do not unzip"
    )
    args = parser.parse_args()

    year = args.year
    target_dir = BASE_DIR / f"canada_{year}"
    urls = URLS_BY_YEAR[year]

    geosuite_zip = target_dir / pathlib.Path(urls["geosuite_zip"]).name
    db_boundary_zip = target_dir / pathlib.Path(urls["db_boundary_zip"]).name

    print(f"Downloading GeoSuite for {year}...")
    download(urls["geosuite_zip"], geosuite_zip)
    print(f"Downloading DB boundary for {year}...")
    download(urls["db_boundary_zip"], db_boundary_zip)

    if not args.no_extract:
        print("Extracting GeoSuite...")
        extract_zip(geosuite_zip, target_dir)

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
