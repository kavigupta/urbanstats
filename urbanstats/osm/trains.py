from permacache import permacache
import tqdm.auto as tqdm

import numpy as np
import pandas as pd
import shapely
import geopandas as gpd

import us

from .query import query_to_geopandas
from ..features.within_distance import census_block_coordinates, point_to_radius


def national_stations_raw():
    query = f"""
    [out:json][timeout:25];
    area(id:3600148838)->.searchArea;
    (
    node["railway"="station"](area.searchArea);
    way["railway"="station"](area.searchArea);
    relation["railway"="station"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
    """
    return query_to_geopandas(query, keep_tags=True)

lookup = {
        'los angeles county metropolitan transportation authority': 'lacmta',
        'no operator': 'no_operator',
        'new york city transit authority': 'nycta',
        'long island rail road': 'lirr',
        'san francisco bay area rapid transit district': 'bart',
        'massachusetts bay transportation authority': 'mbta',
        'new hope & ivyland rail road': 'new_hope_ivyland_rr',
        'metropolitan transportation authority': 'mta',
        'bi-state development agency': 'bi_state_development_agency',
        'chicago transit authority': 'cta',
        'peninsula corridor joint powers board': 'caltrain',
        'long island railroad': 'lirr',
        'port authority of new york and new jersey': 'path',
        "port authority": "path",
        'nj transit': 'nj_transit',
        'new jersey transit': 'nj_transit',
        'san francisco municipal railway': 'sfmuni',
        'niagara frontier transportation authority': 'nfta',
        "o'hare ats": 'ohare_ats',
        'disney transport': 'disney_transport',
        'metropolitan transit authority of harris county, houston, texas': 'houston_mta',
        'wiscasset, waterville and farmington railway': 'wiscasset_waterville_farmington_railway',
        'b&o': 'b_and_o',
        'boone & scenic valley railroad': 'boone_and_scenic_valley_railroad',
        'saratoga and north creek railroad': 'saratoga_and_north_creek_railroad',
        'chehalis centralia railroad & museum': 'chehalis_centralia_railroad_and_museum',
        'wales west rv resort & light railway': 'wales_west_rv_resort_and_light_railway',
        'adrian and blissfield railroad': 'adrian_and_blissfield_railroad',
        'saratoga and north creek railway': 'saratoga_and_north_creek_railway',
        'cooperstown & charlotte valley railroad': 'cooperstown_and_charlotte_valley_railroad',
        'delaware & ulster railroad': 'delaware_and_ulster_railroad',
        'cumbres and toltec scenic railroad': 'cumbres_and_toltec_scenic_railroad',
        'black river and western': 'black_river_and_western',
        'waldemeer & water world': 'waldemeer_and_water_world',
        'black river & western rr': 'black_river_and_western',
        'city and county of honolulu': 'city_and_county_of_honolulu',
        "utah transit athority": "uta",
        "utah transit authority": "uta",
        "utah transit authority (uta)": "uta",
        "metro-north railroad": "metro_north",
        "metro north railroad": "metro_north",
        "detroit transportation corporation": "detroit_people_mover",
        "detroit people mover co.": "detroit_people_mover",
        "detroit people mover co": "detroit_people_mover",
        "detroit people mover": "detroit_people_mover",
        "cats": "charlotte_area_transit_system",
        "charlotte area transit system": "charlotte_area_transit_system",
        "bnsf railway": "bnsf",
        'alaska railroad': 'alaska_railroad',
        'alaska railroad corporation': 'alaska_railroad',
#         'capital metro'
# 'capital metropolitan transportation authority'
        "capital metro": "capital_metropolitan_transportation_authority",
        "capital metropolitan transportation authority": "capital_metropolitan_transportation_authority",
        "csx transportation": "csx",
        "dallas area rapid transit": "dart",
    }


def national_stations():
    stations = national_stations_raw()
    stations["network"] = stations.tags.apply(lambda x: x.get("network", "NO NETWORK"))
    stations["operator"] = stations.tags.apply(lambda x: x.get("operator", "NO OPERATOR").lower())
    stations["operator"] = stations.operator.apply(split_up_operators)
    # flatmap the operator column
    stations = stations.explode("operator")
    stations["operator"] = stations.operator.apply(lambda x: lookup.get(x, x))
    return stations

def split_up_operators(operator):
    if operator == "csx, b&o, amtrak":
        return ["csx", "b&o", "amtrak"]
    if operator == "amtrak, b&o":
        return ["amtrak", "b&o"]
    if operator == "b&o, amtrak":
        return ["b&o", "amtrak"]
    if operator == "amtrak & metra":
        return ["amtrak", "metra"]
    if operator == "amtrak and ctrail":
        return ["amtrak", "ctrail"]
    return operator.split(";")