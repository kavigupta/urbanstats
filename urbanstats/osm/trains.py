from bisect import bisect_right
from collections import defaultdict
import datetime
import io
import json
import os
from typing import Dict, List, Optional, Set, Tuple
import zipfile
import numpy as np
from permacache import permacache
import requests

import pandas as pd
import tqdm.auto as tqdm

from urbanstats.features.within_distance import haversine
from urbanstats.geometry.ellipse import Ellipse

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


@permacache("urbanstats/osm/trains/gtfs_list_2", multiprocess_safe=True)
def gtfs_list():
    # github folder
    url_api = f"https://api.github.com/repos/{repo}/git/trees/{hash}?recursive=1"
    tree = requests.get(url_api).json()["tree"]
    # filter for /feeds
    feeds = [x["path"] for x in tree if x["path"].startswith("feeds/")]
    return feeds


@permacache("urbanstats/osm/trains/read_gtfs_spec_2", multiprocess_safe=True)
def read_gtfs_spec(feed_path):
    url = f"https://raw.githubusercontent.com/{repo}/{hash}/{feed_path}"
    return json.loads(requests.get(url).content)


def api_key():
    with open(os.path.expanduser("~/.transitland")) as f:
        api_key = f.read().strip()
    return api_key


@permacache(
    "urbanstats/osm/trains/read_gtfs_from_feed_id_raw_5", multiprocess_safe=True
)
def read_gtfs_from_feed_id_raw(feed_id):
    try:
        result = requests.get(
            f"https://transit.land/api/v2/rest/feeds/{feed_id}/download_latest_feed_version",
            params=dict(api_key=api_key()),
        )
        if result.status_code != 200:
            return {
                "status": "failure",
                "reason": f"status code {result.status_code}; content: {result.content}",
            }
        return {"status": "success", "content": result.content}
    except requests.exceptions.Timeout:
        return {"status": "failure", "reason": "timeout"}
    except requests.exceptions.ConnectionError:
        return {"status": "failure", "reason": "connection error"}
    except requests.exceptions.ContentDecodingError:
        return {"status": "failure", "reason": "content decoding error"}
    except requests.exceptions.ChunkedEncodingError:
        return {"status": "failure", "reason": "chunked encoding error"}


@permacache("urbanstats/osm/trains/read_gtfs_from_feed_id_4", multiprocess_safe=True)
def read_gtfs_from_feed_id(feed_id):
    res = read_gtfs_from_feed_id_raw(feed_id)
    if res["status"] == "failure":
        return res
    zip_buf = io.BytesIO(res["content"])
    try:
        zip_file = zipfile.ZipFile(zip_buf)
    except zipfile.BadZipFile as e:
        return {"status": "failure", "reason": "bad zip file"}
    # pd.read_csv every file
    return {
        "status": "success",
        "content": {
            name: read_try_multiple_encodings(lambda: zip_file.open(name))
            for name in zip_file.namelist()
        },
    }


def read_try_multiple_encodings(file):
    try:
        try:
            return pd.read_csv(file())
        except UnicodeDecodeError:
            return pd.read_csv(file(), encoding="latin1")
    except pd.errors.EmptyDataError:
        return pd.DataFrame()
    except pd.errors.ParserError:
        return None


def all_gtfs_info():
    urls = gtfs_list()
    for url in tqdm.tqdm(urls):
        spec = read_gtfs_spec(url)
        for feed in spec["feeds"]:
            yield dict(
                feed=feed,
                gtfs_result=lambda feed=feed: read_gtfs_from_feed_id(feed["id"]),
            )


# def successful_gtfs_info():
#     results = {}
#     for res in all_gtfs_info():
#         gtfs = res["gtfs_result"]()
#         if gtfs["status"] == "success":
#             results[res["feed"]["id"]] = {
#                 "feed": res["feed"],
#                 "gtfs_result": gtfs["content"],
#             }
#     return results


@permacache("urbanstats/osm/trains/all_failures")
def all_failures():
    bad_feeds = []
    for res in all_gtfs_info():
        gtfs = res["gtfs_result"]()
        if gtfs["status"] == "failure":
            bad_feeds.append((res["feed"], gtfs["reason"]))
    return bad_feeds


@permacache("urbanstats/osm/trains/all_stops_6")
def all_stops():
    lats, lons = [], []
    ids = []
    for gtfs_info in all_gtfs_info():
        res = gtfs_info["gtfs_result"]()
        if res["status"] != "success":
            continue
        stops = collect_stops(res["content"])
        if stops is None:
            print(
                "Missing stops.txt in feed",
                gtfs_info["feed"]["id"],
                "available feeds:",
                res["content"].keys(),
            )
            continue

        lat_list, lon_list = stops
        lats.extend(lat_list)
        lons.extend(lon_list)
        ids += [gtfs_info["feed"]["id"]] * len(lat_list)
    return pd.DataFrame(dict(lat=lats, lon=lons, feed_id=ids))


def pull_file_from_gtfs(gtfs, filename):
    matching_keys = [key for key in gtfs if key.split("/")[-1] == filename]
    if len(matching_keys) > 1:
        raise ValueError(f"Multiple matching files for {filename}: {matching_keys}")
    if len(matching_keys) == 0:
        return None
    if gtfs[matching_keys[0]] is None:
        return None
    pulled = gtfs[matching_keys[0]].copy()
    pulled.columns = [c.strip() for c in pulled.columns]
    return pulled


def collect_stops(gtfs):
    stops = pull_file_from_gtfs(gtfs, "stops.txt")
    if stops is None:
        return None
    if "stop_lat" not in stops or "stop_lon" not in stops:
        raise ValueError("Missing stop_lat or stop_lon in stops.txt")
    return stops.stop_lat.tolist(), stops.stop_lon.tolist()


def parse_float(val):
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def calendar_dates_to_calendar_txt(exceptions_table) -> pd.DataFrame:
    """
    Converts calendar_dates.txt to calendar.txt format.
    This only applies in situations where calendar.txt is missing.
    """
    # for some reason this filtering is necessary. Some agencies publish
    # calendar_dates.txt with both exception_type 2 (removed service)
    # even when there is no calendar.txt, rendering these entries meaningless.
    exceptions_table = exceptions_table[exceptions_table.exception_type == 1].copy()
    exceptions_table.date = exceptions_table.date.apply(
        lambda x: datetime.datetime.strptime(str(x), "%Y%m%d").date()
    )
    num_days = (exceptions_table.date.max() - exceptions_table.date.min()).days + 1
    exceptions_table["day_of_week"] = exceptions_table.date.apply(lambda x: x.weekday())
    pivot = pd.pivot_table(
        exceptions_table,
        index="service_id",
        columns="day_of_week",
        aggfunc="count",
        values="date",
        fill_value=0,
    )
    return pivot / num_days * 7


def joined_calendar_dates(gtfs) -> Dict[str, Set[datetime.date]]:
    """
    Returns a map of feed IDs to their active dates.
    """
    calendar = pull_file_from_gtfs(gtfs, "calendar.txt")
    calendar_dates = pull_file_from_gtfs(gtfs, "calendar_dates.txt")

    active_dates: Dict[str, Set[datetime.date]] = defaultdict(set)

    if calendar is not None:
        # remove all rows with 0 in all days
        calendar = calendar[
            (calendar.monday == 1)
            | (calendar.tuesday == 1)
            | (calendar.wednesday == 1)
            | (calendar.thursday == 1)
            | (calendar.friday == 1)
            | (calendar.saturday == 1)
            | (calendar.sunday == 1)
        ]
        for _, row in calendar.iterrows():
            active_dates[row["service_id"]] = process_calendar_row(row)

    if calendar_dates is not None:
        calendar_dates.date = calendar_dates.date.apply(parse_date)
        # for _, row in calendar_dates.iterrows():
        for exc, date, service_id in zip(
            calendar_dates["exception_type"],
            calendar_dates["date"],
            calendar_dates["service_id"],
        ):
            if date is None:
                continue
            if exc == 1:  # Added service
                active_dates[service_id].add(date)
            elif exc == 2:  # Removed service
                active_dates[service_id].discard(date)
            else:
                raise ValueError(f"Unknown exception_type: {exc}")
    assert active_dates, "No active dates found in GTFS data."
    return active_dates


def parse_date(date_str: str, default: datetime.date = None) -> datetime.date:
    if date_str != date_str:  # NaN check
        if default is not None:
            return default
        return None
    if isinstance(date_str, (float, int, np.float32, np.float64, np.int64)):
        if date_str > 20991231:
            return default
        date_str = str(int(date_str))
    try:
        return datetime.datetime.strptime(date_str, "%Y%m%d").date()
    except ValueError:
        return None


def process_calendar_row(row) -> Set[datetime.date]:
    start_date = parse_date(row["start_date"])
    end_date = parse_date(row["end_date"], default=datetime.date(2099, 12, 31))
    if start_date is None or end_date is None:
        return set()
    active_days = set()
    delta = datetime.timedelta(days=1)
    current_date = start_date
    while current_date <= end_date:
        weekday = current_date.weekday()  # Monday is 0 and Sunday is 6
        if (
            (weekday == 0 and row.monday == 1)
            or (weekday == 1 and row.tuesday == 1)
            or (weekday == 2 and row.wednesday == 1)
            or (weekday == 3 and row.thursday == 1)
            or (weekday == 4 and row.friday == 1)
            or (weekday == 5 and row.saturday == 1)
            or (weekday == 6 and row.sunday == 1)
        ):
            active_days.add(current_date)
        current_date += delta
    return active_days


def date_range_from_joined_calendar(
    joined_calendar: Dict[str, Set[datetime.date]],
) -> Tuple[datetime.date, datetime.date]:
    all_dates = set()
    for dates in joined_calendar.values():
        all_dates.update(dates)
    if not all_dates:
        return None, None
    return min(all_dates), max(all_dates)


def reverse_joined_calendar(
    joined_calendar: Dict[str, Set[datetime.date]],
) -> Dict[datetime.date, Set[str]]:
    date_to_service_ids: Dict[datetime.date, Set[str]] = defaultdict(set)
    for service_id, dates in joined_calendar.items():
        for date in dates:
            date_to_service_ids[date].add(service_id)
    return date_to_service_ids


def most_covered_period_of_length(
    start_ends: List[Tuple[datetime.date, datetime.date]], length: datetime.timedelta
) -> Tuple[int, datetime.date, datetime.date]:
    """
    Given a list of (start_date, end_date) tuples, finds the longest continuous period.
    """
    all_dates = sorted({x for start, end in start_ends for x in (start, end)})
    date_to_idx = {date: idx for idx, date in enumerate(all_dates)}
    # non-cumulative count of active services.
    # +3 if 3 services start at this date,
    # -2 if 5 services end at this date, but 3 start at this date.
    non_cumulative_counts = [0] * (len(all_dates))
    for start, end in start_ends:
        start_idx = date_to_idx[start]
        end_idx = date_to_idx[end]
        non_cumulative_counts[start_idx] += 1
        non_cumulative_counts[end_idx] -= 1
    cumulative_counts = np.cumsum(non_cumulative_counts)
    assert cumulative_counts[-1] == 0
    cumulative_counts = cumulative_counts[:-1]
    # sliding window to find longest period with non-zero cumulative_counts
    best_count = 0
    best_start = None
    for start_idx, start_date in enumerate(all_dates):
        end_date = start_date + length
        end_idx = bisect_right(all_dates, end_date) - 1
        count = cumulative_counts[start_idx:end_idx].max() if end_idx > start_idx else 0
        if count > best_count:
            best_count = count
            best_start = start_date
    if best_start is None:
        return 0, None, None
    return best_count, best_start, best_start + length


def duplicate_and_shift_calendar(
    start: datetime.date,
    end: datetime.date,
    start_common: datetime.date,
    end_common: datetime.date,
) -> Optional[Tuple[datetime.date, datetime.date]]:
    """
    Returns the usable subrange of the original calendar that can be
    used to map the common period.
    """
    num_days_common = (end_common - start_common).days + 1
    num_days_original = (end - start).days + 1
    if num_days_original < 7:
        return None
    num_days_to_pull = min(num_days_original, num_days_common)
    assert num_days_common % 7 == 0, "Common period must be a multiple of 7 days."
    if start > start_common:
        day_offset = (start_common - start).days % 7
        return [
            start
            + datetime.timedelta(days=index_from_start(num_days_to_pull, i, day_offset))
            for i in range(num_days_common)
        ]
    elif end < end_common:
        day_offset = (end_common - end).days % 7
        return [
            end
            - datetime.timedelta(
                days=index_from_start(num_days_to_pull, i, (-day_offset) % 7)
            )
            for i in range(num_days_common - 1, -1, -1)
        ]
    else:
        return [
            start_common + datetime.timedelta(days=i) for i in range(num_days_common)
        ]


def index_from_start(num_days: int, index: int, modulo_7_offset: int) -> int:
    location = index + modulo_7_offset
    while location >= num_days:
        location -= num_days // 7 * 7
    assert 0 <= location
    return location


@permacache("urbanstats/osm/trains/standardize_calendars_3", multiprocess_safe=True)
def standardize_calendars():
    dates = {}
    for res in all_gtfs_info():
        r = res["gtfs_result"]()
        if r["status"] == "failure":
            continue
        dates[res["feed"]["id"]] = joined_calendar_dates(r["content"])
    time_extrema = {k: date_range_from_joined_calendar(x) for k, x in dates.items()}
    time_extrema = {k: x for k, x in time_extrema.items() if x[0] is not None}
    _, start_common, end_common = most_covered_period_of_length(
        time_extrema.values(), datetime.timedelta(days=27)
    )
    date_remap = {
        k: duplicate_and_shift_calendar(start, end, start_common, end_common)
        for k, (start, end) in time_extrema.items()
    }
    date_remap = {k: v for k, v in date_remap.items() if v is not None}
    services = {}
    for k in tqdm.tqdm(date_remap):
        reversed_calendar = reverse_joined_calendar(dates[k])
        services[k] = [reversed_calendar[x] for x in date_remap[k]]
    day_to_standardized_service_ids, agency_mappings = standardize_service_ids(services)
    return day_to_standardized_service_ids, agency_mappings, start_common, end_common


def standardize_service_ids(
    services: List[Set[str]],
) -> Tuple[List[Set[int]], Dict[str, Dict[str, int]]]:
    """
    Given a list of sets of service IDs (one set per agency),
    standardizes the service IDs across agencies.

    :param services: List of sets of service IDs (one set per agency)
    :return: A tuple containing:
        - day_to_standardized_service_ids: A dictionary mapping each day index to a set of standardized service IDs
        - agency_mappings: A dictionary from an agency key to a dictionary mapping original service IDs to standardized service IDs for each agency
    """
    standardized_service_id = 0
    agency_mappings: Dict[str, Dict[str, int]] = {}
    day_to_standardized_service_ids: List[Set[int]] = []

    for agency_id, agency_services in services.items():
        service_id_mapping: Dict[str, int] = {}
        for day_services in agency_services:
            standardized_ids_for_day: Set[int] = set()
            for service_id in sorted(day_services, key=repr):
                if service_id not in service_id_mapping:
                    service_id_mapping[service_id] = standardized_service_id
                    standardized_service_id += 1
                standardized_ids_for_day.add(service_id_mapping[service_id])
            day_to_standardized_service_ids.append(standardized_ids_for_day)
        agency_mappings[agency_id] = service_id_mapping

    return day_to_standardized_service_ids, agency_mappings


def compute_trip_stop_times(
    gtfs, remap_services, remap_stops
) -> List[Tuple[str, List[Tuple[str, datetime.time]]]]:
    """
    Computes the stop times for each trip in the GTFS data.
    Returns a list of (service_id, List of (stop_id, time)) tuples.
    """
    stop_times = pull_file_from_gtfs(gtfs, "stop_times.txt")
    if stop_times is None:
        return []

    trip_stop_times: Dict[str, List[datetime.time]] = defaultdict(list)

    for trip_id, arrival_time, departure_time, stop_id in zip(
        stop_times["trip_id"],
        stop_times["arrival_time"],
        stop_times["departure_time"],
        stop_times["stop_id"],
    ):
        time = (parse_time(arrival_time) + parse_time(departure_time)) / 2
        trip_stop_times[trip_id].append((time, remap_stops[stop_id]))

    trip_id_to_service_id = {}
    trips = pull_file_from_gtfs(gtfs, "trips.txt")
    if trips is not None:
        for trip_id, service_id in zip(trips["trip_id"], trips["service_id"]):
            trip_id_to_service_id[trip_id] = service_id
    return [
        (
            remap_services[trip_id_to_service_id[trip_id]],
            stop_times_list,
        )
        for trip_id, stop_times_list in trip_stop_times.items()
        if trip_id_to_service_id[trip_id] in remap_services
    ]


def parse_time(time_str: str) -> datetime.timedelta:
    """
    Parses a time string in HH:MM:SS format and returns timedelta object since midnight
    Handles times that exceed 24 hours by being > 24. This should be added to the schedule
    in the agency's local time.
    """
    assert isinstance(time_str, str), f"Expected string, got {type(time_str)}"
    h, m, s = map(int, time_str.split(":"))
    return datetime.timedelta(hours=h, minutes=m, seconds=s)


def is_route_type(route_type) -> bool:
    if not isinstance(route_type, (int, float, np.integer, np.floating)):
        return False
    if int(route_type) != route_type:
        return False
    route_type = int(route_type)
    if 0 <= route_type <= 12:
        return True
    if route_type // 100 in {1, 2, 4, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17}:
        return True
    return False


def is_bus_or_ferry_route_type(route_type) -> bool:
    assert is_route_type(route_type), route_type
    if route_type in {3, 4}:  # bus or ferry
        return True
    if route_type // 100 in {
        2,  # 2xx=coach
        7,  # 7xx=bus
        10,  # 10xx=water transport
        11,  # 11xx=air
        12,  # 12xx=ferry
        13,  # 13xx=aerial lift
        15,  # 15xx=taxi
        17,  # 17xx=misc (the only subcategory is horse carriage)
    }:
        return True
    return False


def valid_routes(gtfs, invalid_route_types) -> Set[str]:
    routes = pull_file_from_gtfs(gtfs, "routes.txt")
    if routes is None:
        return set()
    valid_routes_set = set()
    for route_id, route_type in zip(routes["route_id"], routes["route_type"]):
        if route_type == route_type and not invalid_route_types(route_type):
            valid_routes_set.add(route_id)
    return valid_routes_set


def valid_trips(gtfs, invalid_route_types) -> Set[str]:
    valid_routes_set = valid_routes(gtfs, invalid_route_types)
    trips = pull_file_from_gtfs(gtfs, "trips.txt")
    assert trips is not None, "trips.txt is missing"
    valid_trips_set = set()
    for trip_id, route_id in zip(trips["trip_id"], trips["route_id"]):
        if route_id in valid_routes_set:
            valid_trips_set.add(trip_id)
    return valid_trips_set


def stops_covered_by_valid_trips(gtfs, invalid_route_types) -> Set[str]:
    valid_trips_set = valid_trips(gtfs, invalid_route_types)
    stop_times = pull_file_from_gtfs(gtfs, "stop_times.txt")
    assert stop_times is not None, "stop_times.txt is missing"
    covered_stops = set()
    for trip_id, stop_id in zip(stop_times["trip_id"], stop_times["stop_id"]):
        if trip_id in valid_trips_set:
            covered_stops.add(stop_id)
    return covered_stops


def clean_up_parents(stops: pd.DataFrame) -> pd.DataFrame:
    if "parent_station" not in stops.columns:
        return stops
    assert stops.stop_id.apply(
        lambda x: str(x).strip() != ""
    ).all(), "Empty stop_id found"
    stops["parent_station"] = stops["parent_station"].apply(
        lambda x: x.strip() if isinstance(x, str) and x.strip() != "" else np.nan
    )
    return stops


def pull_stops_for_gtfs(
    gtfs, invalid_route_types
) -> Tuple[pd.DataFrame, Dict[str, str]]:
    stops = pull_file_from_gtfs(gtfs, "stops.txt")
    stops = clean_up_parents(stops)
    assert stops is not None, "stops.txt is missing"
    covered_stops = stops_covered_by_valid_trips(gtfs, invalid_route_types)
    referenced_stops = stops[stops["stop_id"].isin(covered_stops)].copy()
    remap = {}
    if "parent_station" in referenced_stops.columns:
        mask = referenced_stops["parent_station"].apply(
            lambda p: p == p and p in referenced_stops["stop_id"].values
        )
        with_parent, without_parent = (
            referenced_stops.loc[mask].copy(),
            referenced_stops.loc[~mask].copy(),
        )
        original, parent = with_parent["stop_id"], with_parent["parent_station"]
        remap = dict(zip(original, parent))
        referenced_stops = pd.concat(
            [
                without_parent,
                stops[stops.stop_id.isin(parent.unique())],
            ]
        )
    referenced_stops, remap = deduplicate_stops(referenced_stops, remap)
    return referenced_stops, remap


def shatter_clusters_by_distance(
    lons: pd.Series,
    lats: pd.Series,
    clustered_indices: List[List[int]],
    max_distance_m,
) -> List[List[int]]:
    lons, lats = np.array(lons), np.array(lats)
    shattered = []
    for cluster in clustered_indices:
        edges = compute_stop_graph_within_radius(
            max_distance_m / 1000, lons[cluster], lats[cluster]
        )
        components = connected_components(edges, len(lons[cluster]))
        components = [x for x in components if len(x) > 1]
        components = [[cluster[i] for i in comp] for comp in components]
        shattered.extend(components)
    return shattered


def deduplicate_stops(
    stops: pd.DataFrame, remap: Dict[str, str]
) -> Tuple[pd.DataFrame, Dict[str, str]]:
    stops = stops.reset_index(drop=True)
    clustered_indices = defaultdict(list)
    for idx, stop_name in zip(stops.index, stops["stop_name"]):
        clustered_indices[stop_name].append(idx)
    clustered_indices = [sorted(v) for k, v in clustered_indices.items() if len(v) > 1]
    clustered_indices = shatter_clusters_by_distance(
        stops.stop_lon, stops.stop_lat, clustered_indices, max_distance_m=250
    )
    new_rows = []
    remove_indices = []
    for indices in clustered_indices:
        cluster = stops.loc[indices]
        mean_lat = cluster["stop_lat"].mean()
        mean_lon = cluster["stop_lon"].mean()
        row_exemplar = cluster.loc[indices[0]].copy()
        row_exemplar["stop_lat"] = mean_lat
        row_exemplar["stop_lon"] = mean_lon
        new_rows.append(row_exemplar)
        exemplar_id = row_exemplar["stop_id"]
        for idx in indices:
            if stops.at[idx, "stop_id"] != exemplar_id:
                remap[stops.at[idx, "stop_id"]] = exemplar_id
        remove_indices.extend(indices)
    stops = stops.drop(index=remove_indices)
    stops = pd.concat([stops, pd.DataFrame(new_rows)], ignore_index=True)
    return stops, remap


def pull_stops_for_gtfs_arrays(
    gtfs, invalid_route_types, start_idx
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, Dict[str, int]]:
    stops, remap_parent = pull_stops_for_gtfs(gtfs, invalid_route_types)
    names, lats, lons = [], [], []
    remap = {}
    for stop_id, stop_name, stop_lat, stop_lon in zip(
        stops["stop_id"], stops["stop_name"], stops["stop_lat"], stops["stop_lon"]
    ):
        stop_lat, stop_lon = parse_float(stop_lat), parse_float(stop_lon)
        if (
            stop_lat is None
            or stop_lon is None
            or np.isnan(stop_lat)
            or np.isnan(stop_lon)
        ):
            continue
        names.append(stop_name)
        lats.append(stop_lat)
        lons.append(stop_lon)
        remap[stop_id] = start_idx + len(names) - 1
    for stop_id, parent_station in remap_parent.items():
        remap[stop_id] = remap[parent_station]
    return (
        np.array(names),
        np.array(lats),
        np.array(lons),
        remap,
    )


def standardized_stops():
    names, feed_ids, lats, lons = [], [], [], []
    remaps = {}
    start_idx = 0
    for gtfs_info in all_gtfs_info():
        r = gtfs_info["gtfs_result"]()
        if r["status"] != "success":
            continue
        (
            names_array,
            lats_array,
            lons_array,
            remap,
        ) = pull_stops_for_gtfs_arrays(
            r["content"], is_bus_or_ferry_route_type, start_idx
        )
        names.append(names_array)
        feed_ids.extend([gtfs_info["feed"]["id"]] * len(names_array))
        lats.append(lats_array)
        lons.append(lons_array)
        for k, v in remap.items():
            remaps[gtfs_info["feed"]["id"], k] = v
        start_idx += len(names_array)
    return (
        np.concatenate(names),
        np.array(feed_ids),
        np.concatenate(lats),
        np.concatenate(lons),
        remaps,
    )


def compute_stop_graph_within_radius(
    radius_in_km: float, lon: np.ndarray, lat: np.ndarray
) -> List[Tuple[int, int]]:
    indices = np.argsort(lat)
    lats_in_order = lat[indices]
    lons_in_order = lon[indices]
    edges = []
    for i in tqdm.trange(len(lat), desc="Computing stop graph", delay=10):
        ellipse = Ellipse(radius_in_km, lats_in_order[i], lons_in_order[i])
        # only look behind, since the graph is undirected
        start_i = np.searchsorted(
            lats_in_order,
            lats_in_order[i] - ellipse.lat_radius,
            side="right",
        )
        end_i = i
        if end_i == start_i:
            continue
        lat_selected, lon_selected = (
            lats_in_order[start_i:end_i],
            lons_in_order[start_i:end_i],
        )
        ellipse_mask = ((lat_selected - lats_in_order[i]) / ellipse.lat_radius) ** 2 + (
            (lon_selected - lons_in_order[i]) / ellipse.lon_radius
        ) ** 2 < 1
        for j in np.where(ellipse_mask)[0]:
            edges.append((indices[i], indices[start_i + j]))
    return edges


def connected_components(
    edges: List[Tuple[int, int]], num_nodes: int
) -> List[Set[int]]:
    parent = list(range(num_nodes))

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x, y):
        rootX = find(x)
        rootY = find(y)
        if rootX != rootY:
            parent[rootY] = rootX

    for u, v in edges:
        union(u, v)

    components: Dict[int, Set[int]] = defaultdict(set)
    for i in range(num_nodes):
        components[find(i)].add(i)

    return list(components.values())
