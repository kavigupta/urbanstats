import pickle
import re
import pandas as pd
import us

import tqdm
import geopandas as gpd
from permacache import permacache


@permacache("population_density/combine_districts/pre_114")
def compute_114():
    all_shapes = {}
    for i in tqdm.trange(1, 1 + 114):
        all_shapes[i] = gpd.read_file(f"districtShapes/districts{i:03d}.shp")
    seen = set()
    rows = []
    for i in tqdm.trange(1, 1 + 114):
        for j in range(len(all_shapes[i])):
            row = all_shapes[i].iloc[j]
            state, number = row.STATENAME, row.DISTRICT
            congs = list(range(int(row.STARTCONG), 1 + int(row.ENDCONG)))
            elems = {(state, number, cong) for cong in congs}
            if all(x in seen for x in elems):
                continue
            assert not any(x in seen for x in elems)
            rows.append(row)
            seen |= elems
    frame = gpd.GeoDataFrame(rows)
    pre_114 = frame[
        ["STATENAME", "DISTRICT", "STARTCONG", "ENDCONG", "geometry"]
    ].copy()
    pre_114 = pre_114.reset_index(drop=True)
    pre_114 = pre_114.rename(
        columns={
            "STATENAME": "state",
            "DISTRICT": "district",
            "STARTCONG": "start",
            "ENDCONG": "end",
        }
    )
    pre_114.state = pre_114.state.apply(lambda x: us.states.lookup(x).abbr)
    pre_114.start = pre_114.start.apply(int)
    pre_114.end = pre_114.end.apply(int)
    pre_114.loc[pre_114.end == 114, "end"] = 117
    pre_114.loc[
        (pre_114.end == 117) & pre_114.state.apply(lambda x: x in {"VA", "FL", "NC"}),
        "end",
    ] = 114
    pre_114.loc[
        (pre_114.end == 117) & pre_114.state.apply(lambda x: x in {"PA"}), "end"
    ] = 115
    return pre_114


def compute_from_data_gov_tiger(path, states):
    frame = gpd.read_file(path)
    frame["state"] = frame.STATEFP.apply(lambda x: us.states.lookup(x).abbr)
    frame = frame[frame.state.apply(lambda x: x in states)].copy()
    frame["district"] = frame.NAMELSAD.apply(
        lambda x: re.match(r"Congressional District (\d+)", x).group(1)
    )
    frame = frame[["state", "district", "geometry"]].copy()
    return frame


@permacache("population_density/combine_districts/compute_115")
def compute_115():
    f115_filt = compute_from_data_gov_tiger("tl_2016_us_cd115.zip", {"VA", "FL", "NC"})
    f115_filt["start"] = 115
    f115_filt["end"] = 117
    f115_filt.loc[f115_filt.state == "NC", "end"] = 116
    return f115_filt


@permacache("population_density/combine_districts/compute_116")
def compute_116():
    f116 = compute_from_data_gov_tiger("tl_2019_us_cd116.zip", {"PA"})
    f116["start"] = 116
    f116["end"] = 117
    return f116


@permacache("population_density/combine_districts/compute_117")
def compute_117():
    nc = gpd.read_file("117_nc.zip")
    nc["state"] = "NC"
    nc["district"] = nc["DISTRICT"]
    nc["start"] = 117
    nc["end"] = 117
    nc = nc[["state", "district", "start", "end", "geometry"]].copy()
    return nc


tables = [compute_114(), compute_115(), compute_116(), compute_117()]
updated_crs = []
for table in tables:
    if table.crs is None:
        table.crs = "EPSG:4326"
    updated_crs.append(table.to_crs("EPSG:4326"))

full_table = gpd.GeoDataFrame(pd.concat(updated_crs))
full_table = full_table.sort_values(["start", "end", "state", "district"])
full_table = full_table[full_table.district.apply(int) > 0]
full_table = full_table.reset_index(drop=True)

with open("combo/historical.pkl", "wb") as f:
    pickle.dump(full_table, f)
