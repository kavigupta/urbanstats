
import os
import tempfile
import zipfile
import pytz
import datetime as DT

import geopandas as gpd

def get_canonical_timezones():
    # based heavily on https://stackoverflow.com/a/27494062/1549476
    utcnow = DT.datetime.utcnow()

    canonical = dict()
    for name in pytz.all_timezones:
        tzone = pytz.timezone(name)
        try:
            dstoffset = tzone.dst(utcnow, is_dst=False)
        except TypeError:
            # pytz.utc.dst does not have a is_dst keyword argument
            dstoffset = tzone.dst(utcnow)
        if dstoffset == DT.timedelta(0):
            # utcnow happens to be in a non-DST period
            canonical[name] = tzone.localize(utcnow, is_dst=False)
        else:
            # step through the transition times until we find a non-DST datetime
            for transition in tzone._utc_transition_times[::-1]:
                dstoffset = tzone.dst(transition, is_dst=False) 
                if dstoffset == DT.timedelta(0):
                    canonical[name] = tzone.localize(transition, is_dst=False)
                    break

    canonical = {k : v.tzinfo.utcoffset(v).total_seconds() / 3600 for k, v in canonical.items()}
                    
    # All timezones have been accounted for
    assert len(canonical) == len(pytz.all_timezones)
    return canonical

def dissolved_timezones_direct():
    f = gpd.read_file("named_region_shapefiles/world_timezones.zip")
    f = f[f.TZID != "uninhabited"].copy()
    manual = {
        "America/Bahia Banderas": "UTC-06:00",
        "America/Coral Harbour": "UTC-05:00",
        "America/North Dakota/Beulah": "UTC-06:00",
        "America/Whitehorse": "UTC-07:00",
        "Antarctica/Macquarie": "UTC+10:00",
        "Pacific/Chuuk": "UTC+10:00",
        "Pacific/Pohnpei": "UTC+11:00",
    }
    for k, v in manual.items():
        f.loc[f.TZID == k, "UTC_OFFSET"] = v
    fully_dissolved = f.dissolve("UTC_OFFSET")
    fully_dissolved = fully_dissolved.reset_index()
    fully_dissolved.reset_index()
    fully_dissolved.UTC_OFFSET = fully_dissolved.UTC_OFFSET.apply(lambda x: x.replace("Â", ""))
    return fully_dissolved

def dissolved_timezones():
    path = "named_region_shapefiles/timezones_dissolved"
    if not os.path.exists(path):
        c = dissolved_timezones_direct()
        try:
            os.makedirs(path)
        except FileExistsError:
            pass
        c.to_file(path + "/timezones.shp", encoding="utf-8")
    return gpd.read_file(path + "/timezones.shp")