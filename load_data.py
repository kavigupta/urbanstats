import os
import glob
import json
import urllib

import addfips
import us
import geopandas
import pandas as pd
import requests
import tempfile

import tqdm.auto as tqdm

import electiondata as e
from permacache import permacache

from py_essentials import hashing


@permacache(
    "population_density/load_blocks",
    key_function=dict(path=lambda path: hashing.fileChecksum(path, "sha256")),
)
def load_blocks(path):
    result = pd.read_csv(path)
    blocks = result[(result.BLOCK == result.BLOCK) & (result.POP100 > 0)]
    blocks.COUNTY = blocks.COUNTY.apply(lambda x: f"{int(x):03d}")
    blocks["FIPS"] = (
        blocks.STUSAB.apply(lambda x: us.states.lookup(x).fips) + blocks.COUNTY
    )
    return blocks


@permacache("population_density/load_subcounties_geojson")
def load_subcounties_geojson():
    tempdir = tempfile.TemporaryDirectory()
    rootpath = tempdir.name

    os.system(f"mkdir -p {rootpath}")
    root = "https://www2.census.gov/geo/tiger/TIGER2020PL/LAYER/COUSUB/2020/"
    [table] = pd.read_html(root)
    for path in tqdm.tqdm(
        [x for x in table.Name if isinstance(x, str) and x[10] == "_"]
    ):
        with urllib.request.urlopen(root + path) as f:
            data = f.read()
        with open(f"{rootpath}/{path}", "wb") as f:
            f.write(data)
    for path in tqdm.tqdm(glob.glob(f"{rootpath}/*.zip")):
        os.system(f"cd {rootpath}; unzip {path}")
    for path in tqdm.tqdm(glob.glob(f"{rootpath}/*.shp")):
        geopandas.read_file(path).to_file(f"{path}.geojson", driver="GeoJSON")
    results = {}
    for path in tqdm.tqdm(glob.glob(f"{rootpath}/*.geojson")):
        with open(path) as f:
            res = json.load(f)
        assert set(res) == {"type", "crs", "features"}
        assert res["type"] == results.get("type", res["type"])
        assert res["crs"] == results.get("crs", res["crs"])
        results["features"] = results.get("features", []) + res["features"]
    results["features"] = [
        dict(
            **x,
            id=x["properties"]["STATEFP20"]
            + x["properties"]["COUNTYFP20"]
            + x["properties"]["COUSUBFP20"],
        )
        for x in results["features"]
    ]
    return results


def get_fips_to_state():
    return {x.fips: x.abbr for x in us.states.STATES_AND_TERRITORIES + [us.states.DC]}


def get_fips_to_counties():
    fips_to_state = get_fips_to_state()
    fips_to_counties = {
        a + c: f"{b.title()}, {fips_to_state[a]}"
        for a, bcs in addfips.AddFIPS()._counties.items()
        for b, c in bcs.items()
        if a in fips_to_state
    }
    fips_to_counties["02AL"] = "Alaska"
    return fips_to_counties


def get_subfips_to_subcounty_name():
    subcounties_geojson = load_subcounties_geojson()
    fips_to_counties = get_fips_to_counties()
    subfips_to_state = {}
    for x in subcounties_geojson["features"]:
        fips = x["id"][:5]
        if fips not in fips_to_counties:
            print(fips)
            continue
        subfips_to_state[x["id"]] = (
            x["properties"]["NAME20"] + ", " + fips_to_counties[fips]
        )
    return subfips_to_state


@permacache("population_density/load_data/load_county_geojson_2")
def load_county_geojson():
    tempdir = tempfile.TemporaryDirectory()
    rootpath = tempdir.name
    os.system(f"mkdir -p {rootpath}")
    zip = requests.get(
        "https://www2.census.gov/geo/tiger/GENZ2018/shp/cb_2018_us_county_500k.zip"
    ).content
    with open(f"{rootpath}/hi.zip", "wb") as f:
        f.write(zip)
    os.system(f"cd {rootpath}; unzip hi.zip")

    geopandas.read_file(f"{rootpath}/cb_2018_us_county_500k.shp").to_file(
        f"{rootpath}/hi.geojson", driver="GeoJSON"
    )
    with open(f"{rootpath}/hi.geojson") as f:
        counties_geojson = json.load(f)
    counties_geojson["features"] = [
        dict(**x, id=x["properties"]["STATEFP"] + x["properties"]["COUNTYFP"])
        for x in counties_geojson["features"]
    ]
    return counties_geojson
