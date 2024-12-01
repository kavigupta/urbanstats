import copy
import os

import geopandas as gpd
import tqdm.auto as tqdm

from urbanstats.special_cases.country_names import iso_to_country
from urbanstats.special_cases.special_subnational_source import (
    SPECIAL_SUBNATIONAL_SOURCES,
)

# < 50m
SIMPLIFY_REALLY_SMALL = 1 / 120 * 50e-3
# < 1km
SIMPLIFY_WATER = 1 / 120


def subnational_regions_direct():
    path = "named_region_shapefiles/World_Administrative_Divisions.zip"
    data = gpd.read_file(path)
    print("read subnational regions")
    data = data[data.COUNTRY.apply(lambda x: x is not None)]
    new_row_for_ph_ncr = copy.deepcopy(data.iloc[0])
    metro_manilla = "named_region_shapefiles/metro_manila.geojson"
    new_row_for_ph_ncr.geometry = gpd.read_file(metro_manilla).iloc[0].geometry
    new_row_for_ph_ncr.NAME = "National Capital Region"
    new_row_for_ph_ncr.ISO_CC = "PH"
    new_row_for_ph_ncr.ISO_SUB = "NCR"
    data = data.append(new_row_for_ph_ncr)
    data["fullname"] = data.NAME + ", " + data.ISO_CC.apply(iso_to_country)
    data["dissolveby"] = data["fullname"]
    data = data.dissolve(by="dissolveby")
    print("dissolved subnationals")

    data = data.reset_index(drop=True)

    unmanipulated_indices = []
    for source in SPECIAL_SUBNATIONAL_SOURCES:
        unmanipulated_indices += source.replace_subnational_geographies(data)

    # apply filter_small_islands to each row
    for i, row in tqdm.tqdm(list(data.iterrows())):
        if i in unmanipulated_indices:
            continue
        print(row.NAME + ", " + row.COUNTRY)
        data.loc[i] = filter_small_islands(row)
    data = buffer_all(data, SIMPLIFY_WATER, unmanipulated_indices)
    print("buffered subnationals")
    return data


def filter_small_islands(r):
    r = copy.deepcopy(r)
    g = gpd.GeoDataFrame([r])
    polys = gpd.GeoSeries(
        g.geometry.apply(
            lambda g: g.geoms if g.geom_type == "MultiPolygon" else [g]
        ).explode()
    )
    if len(polys) > 100:
        a = polys.set_crs("epsg:4326").to_crs({"proj": "cea"}).area
        min_area = min(10 * 1000**2, a.max() / 10)
        r.geometry = polys[a > min_area].buffer(0).unary_union
    r.geometry.simplify(SIMPLIFY_REALLY_SMALL)
    return r


def bounds_overlap(bounds1, bounds2):
    lon1, lat1, lon2, lat2 = bounds1
    lon3, lat3, lon4, lat4 = bounds2
    lon_does_overlap = not (lon1 < lon2 < lon3 < lon4 or lon3 < lon4 < lon1 < lon2)
    lat_does_overlap = not (lat1 < lat2 < lat3 < lat4 or lat3 < lat4 < lat1 < lat2)
    return lon_does_overlap and lat_does_overlap


def buffer_geometry(data, idx, buffer):
    geom = data.iloc[idx].geometry
    buffered_geom = geom.buffer(buffer).simplify(buffer / 2)
    idxs = []
    for idx_other in tqdm.trange(data.shape[0]):
        if idx == idx_other:
            continue
        if not bounds_overlap(data.bounds_tuples[idx], data.bounds_tuples[idx_other]):
            continue
        if buffered_geom.intersection(data.geometry[idx_other]).area > 0:
            idxs.append(idx_other)
    for idx_other in tqdm.tqdm(idxs):
        buffered_geom = buffered_geom.difference(data.geometry[idx_other])
    return buffered_geom


def buffer_all(data, buffer, unmanipulated_indices):
    data = data.copy()
    data["bounds_tuples"] = data.geometry.apply(lambda x: x.bounds)
    fullname = data.NAME + ", " + data.COUNTRY
    for idx in tqdm.trange(data.shape[0]):
        if idx in unmanipulated_indices:
            continue
        print(fullname[idx])
        data.loc[idx, "geometry"] = buffer_geometry(data, idx, buffer)
    del data["bounds_tuples"]
    data.geometry = data.geometry.buffer(0)
    return data


def subnational_regions():
    path = "named_region_shapefiles/World_Administrative_Divisions_processed"
    if not os.path.exists(path):
        snr = subnational_regions_direct()
        os.makedirs(path)
        snr.to_file(path + "/subnational_regions.shp", encoding="utf-8")
    return gpd.read_file(path + "/subnational_regions.shp")


def countries_direct():
    data = subnational_regions()
    print("read countries")
    data["dissolveby"] = data.ISO_CC
    data = data.dissolve(by="dissolveby")
    print("dissolved countries")
    data.geometry = data.geometry.buffer(0)
    data = data.reset_index(drop=True)
    return data


def countries():
    path = "named_region_shapefiles/countries_processed"
    if not os.path.exists(path):
        c = countries_direct()
        os.makedirs(path)
        c.to_file(path + "/countries.shp", encoding="utf-8")
    return gpd.read_file(path + "/countries.shp")


def continents_direct():
    data = gpd.read_file("named_region_shapefiles/continents/subnational_regions.shp")
    data = data.dissolve("newcont")
    country_sh = countries()
    canada = country_sh[country_sh.COUNTRY == "Canada"].iloc[0].geometry
    north_america = data.loc['north america'].geometry
    north_america = north_america.union(canada)
    data.loc['north america', 'geometry'] = north_america
    data.geometry = data.geometry.buffer(SIMPLIFY_REALLY_SMALL)
    data.geometry = data.geometry.simplify(SIMPLIFY_REALLY_SMALL)
    data["name"] = [x.title() for x in data.index]
    data = data.reset_index(drop=True)
    return data


def continents():
    path = "named_region_shapefiles/continents_processed"
    if not os.path.exists(path):
        c = continents_direct()
        os.makedirs(path)
        c.to_file(path + "/continents.shp", encoding="utf-8")
    return gpd.read_file(path + "/continents.shp")
