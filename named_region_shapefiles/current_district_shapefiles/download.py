import os
import pickle
import requests
import tqdm
import us
import subprocess

import geopandas as gpd
import pandas as pd

metadata = [
    ("CD", "cd118", "STATEFP20", "CD118FP"),
    ("SLDL", "sldl", "STATEFP", "SLDLST"),
    ("SLDU", "sldu", "STATEFP", "SLDUST"),
]


def download():
    """
    download all of the form https://www2.census.gov/geo/tiger/TIGER_RD18/LAYER/CD/tl_rd22_01_cd118.zip
    """
    for state in tqdm.tqdm(us.STATES):
        fips = state.fips
        for layer, suffix, _, _ in metadata:
            url = f"https://www2.census.gov/geo/tiger/TIGER_RD18/LAYER/{layer}/tl_rd22_{fips}_{suffix}.zip"
            fil = path(fips, suffix)
            if os.path.exists(fil):
                continue
            resp = requests.get(url)
            if resp.status_code == 404:
                print(f"Skipping {url}")
                continue
            resp.raise_for_status()
            with open(fil, "wb") as f:
                f.write(resp.content)


def num_digits(x):
    return len(str(x - 1))


def path(fips, suffix):
    return f"shapefiles/tl_rd22_{fips}_{suffix}.zip"


def combine_shapefiles(suffix, state_column, number_column):
    files = []
    for state in tqdm.tqdm(us.STATES):
        fips = state.fips
        p = path(fips, suffix)
        if not os.path.exists(p):
            print(f"Skipping {suffix} for {state.abbr}")
            continue
        files.append(gpd.read_file(p))
    result = gpd.GeoDataFrame(pd.concat(files).reset_index(drop=True))
    result.insert(
        0, "state", result[state_column].apply(lambda x: us.states.lookup(x).abbr)
    )
    result = result[result[number_column].apply(lambda x: x[0] != "Z")]
    result["district"] = result[number_column]
    with open(f"shapefiles/{suffix}.pkl", "wb") as f:
        pickle.dump(result, f)


def main():
    subprocess.run(["mkdir", "-p", "shapefiles"])
    download()
    for _, suffix, state_column, number_column in metadata:
        combine_shapefiles(suffix, state_column, number_column)


if __name__ == "__main__":
    main()
