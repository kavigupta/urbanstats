from collections import defaultdict
import io
import json
import os
import zipfile
from permacache import permacache
import requests

import pandas as pd

from .query import query_to_geopandas


def national_stations():
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


repo = "transitland/transitland-atlas"
hash = "821069d1a80ee041e29d86ee093c5b71ddcf0da4"


@permacache("urbanstats/osm/trains/gtfs_list", multiprocess_safe=True)
def gtfs_list():
    # github folder
    url_api = f"https://api.github.com/repos/{repo}/git/trees/{hash}?recursive=1"
    tree = requests.get(url_api).json()["tree"]
    # filter for /feeds
    feeds = [x["path"] for x in tree if x["path"].startswith("feeds/")]
    return feeds


@permacache("urbanstats/osm/trains/read_gtfs_spec", multiprocess_safe=True)
def read_gtfs_spec(feed_path):
    url = f"https://raw.githubusercontent.com/{repo}/{hash}/{feed_path}"
    return json.loads(requests.get(url).content)


def api_key():
    with open(os.path.expanduser("~/.transitland")) as f:
        api_key = f.read().strip()
    return api_key


@permacache("urbanstats/osm/trains/read_gtfs_from_feed_id_raw_2", multiprocess_safe=True)
def read_gtfs_from_feed_id_raw(feed_id):
    try:
        return requests.get(
            f"https://transit.land/api/v2/rest/feeds/{feed_id}/download_latest_feed_version",
            params=dict(api_key=api_key()),
        ).content
    except requests.exceptions.Timeout:
        return b""
    except requests.exceptions.ConnectionError:
        return b""
    except requests.exceptions.ContentDecodingError:
        return b""
    except requests.exceptions.ChunkedEncodingError:
        return b""

@permacache("urbanstats/osm/trains/read_gtfs_from_feed_id", multiprocess_safe=True)
def read_gtfs_from_feed_id(feed_id):
    zip_buf = io.BytesIO(read_gtfs_from_feed_id_raw(feed_id))
    try:
        zip_file = zipfile.ZipFile(zip_buf)
    except zipfile.BadZipFile as e:
        print(e)
        return None
    # pd.read_csv every file
    return {
        name: read_try_multiple_encodings(lambda: zip_file.open(name))
        for name in zip_file.namelist()
    }


def read_try_multiple_encodings(file):
    try:
        return pd.read_csv(file())
    except UnicodeDecodeError:
        return pd.read_csv(file(), encoding="latin1")
    except pd.errors.EmptyDataError:
        return pd.DataFrame()


@permacache("urbanstats/osm/trains/gtfs_stops_5")
def gtfs_stops(url):
    print(url)
    zip_buf = io.BytesIO(requests.get(url).content)
    zip_file = zipfile.ZipFile(zip_buf)
    if "agency.txt" in zip_file.namelist():
        agency_table = pd.read_csv(zip_file.open("agency.txt"))
    else:
        agency_table = None
    routes_table = pd.read_csv(zip_file.open("routes.txt"))
    routes_table = routes_table[routes_table.route_type != 3].copy()
    if "agency_id" not in routes_table.columns:
        if agency_table is None:
            routes_table["agency_id"] = None
        else:
            assert (
                agency_table.shape[0] == 1
            ), "Multiple agencies in GTFS; but no agency_id in routes.txt"
            routes_table["agency_id"] = agency_table.agency_id.iloc[0]
    route_to_type = dict(zip(routes_table.route_id, routes_table.route_type))
    route_to_agency = dict(zip(routes_table.route_id, routes_table.agency_id))
    stop_times = pd.read_csv(zip_file.open("stop_times.txt"))
    trips = pd.read_csv(zip_file.open("trips.txt")).set_index("trip_id")

    stop_route = set(zip(stop_times.stop_id, trips.loc[stop_times.trip_id].route_id))
    stop_to_types = merge(route_to_type, stop_route)
    stop_to_agency = merge(route_to_agency, stop_route)
    stops = pd.read_csv(zip_file.open("stops.txt"))
    stops.location_type = stops.location_type.fillna(0)
    stops["types"] = stops.stop_id.apply(lambda x: stop_to_types.get(str(x), []))
    stops["agency_id"] = stops.stop_id.apply(lambda x: stop_to_agency.get(str(x), []))
    stops = stops.set_index("stop_id")
    if "parent_station" in stops.columns:
        with_parent_mask = stops.parent_station == stops.parent_station
        stops_with_parent = stops[with_parent_mask]
        for parent, ts, ais in zip(
            stops_with_parent.parent_station,
            stops_with_parent.types,
            stops_with_parent.agency_id,
        ):
            stops.loc[parent].types.extend(ts)
            stops.loc[parent].agency_id.extend(ais)
        stops = stops[~with_parent_mask]
    stops.types = stops.types.apply(lambda x: sorted(set(x)))
    stops.agency_id = stops.agency_id.apply(lambda x: sorted(set(x)))
    stops = stops[stops.types.apply(lambda x: len(x) > 0)]
    return stops, agency_table


def merge(route_to_x, stop_route):
    stop_to_x = defaultdict(set)
    for stop, route in stop_route:
        if route not in route_to_x:
            continue
        stop_to_x[stop].add(route_to_x[route])
    stop_to_x = {str(k): sorted(v) for k, v in stop_to_x.items()}
    return stop_to_x
