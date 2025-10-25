from collections import defaultdict
from collections.abc import Set
import datetime
import io
import json
import os
from typing import Dict, Tuple
import zipfile
import numpy as np
from permacache import permacache
import requests

import pandas as pd
import tqdm.auto as tqdm

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
