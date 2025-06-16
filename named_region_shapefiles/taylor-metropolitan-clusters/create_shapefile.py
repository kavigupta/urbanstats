"""
Got the files ucls_* from Taylor via personal communication, as well as names_full.txt and uc_metadata.zip.
"""

import glob
import json
import re
import unicodedata
import zipfile
from difflib import SequenceMatcher
from functools import lru_cache
from typing import Counter

import geopandas as gpd
import numpy as np
import pandas as pd
import PIL.Image
import requests
import shapely
import tqdm
from permacache import permacache, stable_hash

# 0_0 is 70N to 60N, 180W to 170W, and then it's y_x across the grid.

degrees_each = 10
cells_per_degree = 60 * 60 // 3  # 3 seconds per cell


@lru_cache(None)
def filenames():
    by_y_x = {}

    file_format = re.compile(r"(\d+)_(\d+)\.png")

    zips = glob.glob("ucls*.zip")
    for z in zips:
        with zipfile.ZipFile(z) as zf:
            for f in zf.namelist():
                m = file_format.match(f)
                assert m, f
                y, x = int(m.group(1)), int(m.group(2))
                by_y_x[(y, x)] = z, f
    return by_y_x


def load_image(y, x):
    z, f = filenames()[(y, x)]
    with zipfile.ZipFile(z) as zf:
        with zf.open(f) as file:
            im = PIL.Image.open(file)
            assert im.size == (
                degrees_each * cells_per_degree,
                degrees_each * cells_per_degree,
            )
            # return a numpy array (it is already rgb)
            return np.array(im)


def image_to_idxs(im_arr):
    """
    Taylor sent me this

    fmatr[:, :, 0] = ((data & 2) << 6) | ((data & 16) << 2) | ((data & 128) >> 2) | ((data & 1024) >> 6) | ((data & 8192) >> 10)
    fmatr[:, :, 1] = ((data & 1) << 7) | ((data & 8) << 3) | ((data & 64) >> 1) | ((data & 512) >> 5) | ((data & 4096) >> 9) | ((data & 32768) >> 13)
    fmatr[:, :, 2] = ((data & 4) << 5) | ((data & 32) << 1) | ((data & 256) >> 3) | ((data & 2048) >> 7) | ((data & 16384) >> 11)

    im_arr is fmatr. We need to convert it into data
    """
    data = np.zeros(im_arr.shape[:2], dtype=np.uint16)

    # each element of the instructions array is [(image rgb channel, source bit (1, 2, 4, 8, ...), offset (signed int, + means <<, - means >>))]
    instructions = [
        (0, 2, 6),
        (0, 16, 2),
        (0, 128, -2),
        (0, 1024, -6),
        (0, 8192, -10),
        (1, 1, 7),
        (1, 8, 3),
        (1, 64, -1),
        (1, 512, -5),
        (1, 4096, -9),
        (1, 32768, -13),
        (2, 4, 5),
        (2, 32, 1),
        (2, 256, -3),
        (2, 2048, -7),
        (2, 16384, -11),
    ]

    for channel, source_bit, offset in instructions:
        # if source bit is 1024, source_bit_idx = 10
        source_bit_idx = int(np.round(np.log2(source_bit)))
        location_within_channel = source_bit_idx + offset
        assert (
            0 <= location_within_channel < 8
        ), f"Invalid location {location_within_channel} for channel {channel} and source bit {source_bit}"

        # isolate the image channel
        channel_data = (im_arr[:, :, channel] >> location_within_channel) & 1
        # shift it to the correct position in the data array
        data |= channel_data.astype(np.uint16) << source_bit_idx

    return data


def image_idxs_to_arrays(y_overall, x_overall, data):
    ys, xs = np.where(data > 0)
    d = data[ys, xs]
    ys = ys + y_overall * degrees_each * cells_per_degree
    xs = xs + x_overall * degrees_each * cells_per_degree
    return ys, xs, d


@permacache("urbanstats/named_region_shapefiles/taylor-metropolitan-clusters/load_idxs")
def load_idxs(y, x):
    im = load_image(y, x)
    idxs = image_idxs_to_arrays(y, x, image_to_idxs(im))
    return idxs


def load_all_idxs():
    all_idxs = []
    for y, x in tqdm.tqdm(sorted(filenames().keys())):
        idxs = load_idxs(y, x)
        all_idxs.append(idxs)
    return [np.concatenate(x) for x in zip(*all_idxs)]


@permacache(
    "urbanstats/named_region_shapefiles/taylor-metropolitan-clusters/load_shapes_as_points_2"
)
def load_shapes_as_points():
    print("Total files:", len(filenames()))

    ys, xs, ranks = load_all_idxs()
    assert len(ys) == len(xs) == len(ranks)
    assert len(set(ranks)) == ranks.max()
    print("Total shapes:", ranks.max())
    ordering = np.argsort(ranks)
    ys, xs, ranks = (
        ys[ordering],
        xs[ordering],
        ranks[ordering],
    )
    breaks = np.where(np.diff(ranks) > 0)[0] + 1
    shapes = []
    for i, (start, end) in tqdm.tqdm(
        list(enumerate(zip([0, *breaks], [*breaks, len(ys)])))
    ):
        assert (
            i + 1 == ranks[start] == ranks[end - 1]
        ), f"Rank mismatch at {i}: {ranks[start]} vs {ranks[end - 1]}"
        shapes.append(
            [
                ys[start:end],
                xs[start:end],
            ]
        )
    return shapes


def idx_to_latlon_topleft(y, x):
    """
    Convert y, x indices to latitude and longitude.
    """
    lat = 70 - (y / cells_per_degree)
    lon = -180 + (x / cells_per_degree)
    return lat, lon


def idx_to_latlon_bottomright(y, x):
    """
    Convert y, x indices to latitude and longitude.
    """
    return idx_to_latlon_topleft(y + 1, x + 1)


def encode_as_rows(lats, lons):
    ordering = np.argsort(lons)
    lats = lats[ordering]
    lons = lons[ordering]
    ordering = np.argsort(lats, kind="stable")
    lats = lats[ordering]
    lons = lons[ordering]
    lat_breaks = np.where(np.diff(lats) > 0)[0] + 1
    rows = []
    for lat_start, lat_end in zip([0, *lat_breaks], [*lat_breaks, len(lats)]):
        lon_breaks = np.where(np.diff(lons[lat_start:lat_end]) > 1)[0] + 1
        for lon_start, lon_end in zip(
            [0, *lon_breaks], [*lon_breaks, lat_end - lat_start]
        ):
            rows.append(
                [
                    lats[lat_start],
                    lons[lat_start + lon_start],
                    lons[lat_start + lon_end - 1],
                ]
            )
    return rows


@permacache(
    "urbanstats/named_region_shapefiles/taylor-metropolitan-clusters/convert_shape_to_shapefile"
)
def convert_shape_to_shapefile(lats, lons):
    """
    Convert a shape defined by latitude and longitude points to a shapefile format.
    """

    # create one box per line
    row_boxes = []
    for lat, lon1, lon2 in encode_as_rows(lats, lons):
        top_left_lat, top_left_lon = idx_to_latlon_topleft(lat, lon1)
        bottom_right_lat, bottom_right_lon = idx_to_latlon_bottomright(lat, lon2)
        row_boxes.append(
            shapely.geometry.box(
                minx=top_left_lon,
                miny=bottom_right_lat,
                maxx=bottom_right_lon,
                maxy=top_left_lat,
            )
        )
    # take the union of all boxes
    shape = shapely.unary_union(row_boxes)
    return shape


def create_shapefile():
    shapes = load_shapes_as_points()
    shapes = [convert_shape_to_shapefile(*s) for s in tqdm.tqdm(shapes)]

    # Save the shapes to a file
    gdf = gpd.GeoDataFrame(
        dict(rank=np.arange(len(shapes)) + 1), geometry=shapes, crs="EPSG:4326"
    )
    return gdf


@permacache(
    "urbanstats/named_region_shapefiles/taylor-metropolitan-clusters/get_wikidata_title_and_population",
)
def get_wikidata_title_and_population(tag):
    # tag is something like "Q13942981"
    # get the name in either English or the first language available

    url = f"https://www.wikidata.org/wiki/Special:EntityData/{tag}.json"
    response = requests.get(url)
    data = response.json()
    entities = data.get("entities", {})
    if not entities:
        return None
    entity = next(iter(entities.values()))
    title = get_label(entity)
    if title is None:
        return None
    population = entity.get("claims", {}).get("P1082", [])
    if population:
        population = (
            population[0]
            .get("mainsnak", {})
            .get("datavalue", {})
            .get("value", {})
            .get("amount")
        )
        if population is not None:
            population = float(population.replace("+", "").replace("xsd:integer", ""))
    else:
        population = None
    return title, population


def get_label(entity):
    labels = entity.get("labels", {})
    # try to get the English label first
    label = labels.get("en")
    if label is not None:
        return label.get("value")
    labels = list(labels.values())
    if not labels:
        return None
    return labels[0].get("value", None)


def produce_name_based_on_wikidata(candidates_annotated):
    """
    Given a list of candidates, return the one with the highest population.
    If there are multiple candidates with the same population, return the first one.
    """
    candidates = [tag for metatag, tag, *_ in candidates_annotated if metatag == "C"]
    if not candidates:
        return None
    title_pops = [(tag, get_wikidata_title_and_population(tag)) for tag in candidates]
    title_pops = [(tag, *x) for tag, x in title_pops if x is not None]
    if not title_pops:
        return None

    if not any(x[2] is not None for x in title_pops):
        # if all populations are None, return the first, sorted by the tag (after Q)
        title_pops = sorted(title_pops, key=lambda x: int(x[0][1:]))
        return [title_pops[0][1]]

    title_pops = [
        (tag, title, pop) for tag, title, pop in title_pops if pop is not None
    ]

    title_pops = sorted(title_pops, key=lambda x: x[2], reverse=True)

    return [title for tag, title, pop in title_pops]


def load_metadata():
    with zipfile.ZipFile("uc_metadata.zip") as zf:
        with zf.open("ucs_data.csv") as f:
            table = pd.read_csv(f)
        table = table[["id", "rank", "pop", "core"]]
        with zf.open("name_candidates.txt") as f:
            code = f.read().decode("latin-1")
        # pylint: disable=eval-used
        # This is a list of tuples (id, name, metatag, *rest), it isn't valid json
        name_candidates = eval(code)

    with zipfile.ZipFile("names_full.zip") as zf:
        with zf.open("names_full.txt", "r") as f:
            # pylint: disable=eval-used
            # same as above
            curated_names = eval(f.read())

    return table, name_candidates, curated_names


def parse_num_or_zero(s):
    """
    Parse a string as an integer, returning 0 if it is empty or not a number.
    """
    try:
        return int(s)
    except (ValueError, TypeError):
        return 0


def process_curated_name(curated_names):
    curated_names = sorted(
        curated_names, key=lambda x: parse_num_or_zero(x[2]), reverse=True
    )
    curated_names = [
        x
        for x in curated_names
        if parse_num_or_zero(x[2]) >= parse_num_or_zero(curated_names[0][2]) / 2
    ]
    curated_names = [x[1] for x in curated_names]
    return curated_names


def render_coord(coord, precision):
    """
    Render a coordinate as a string with the given precision.
    """

    def render_float(f):
        return f"{f:.{precision}f}"

    result = []
    if coord.y < 0:
        result.append("S")
        result.append(render_float(-coord.y))
    else:
        result.append("N")
        result.append(render_float(coord.y))
    if coord.x < 0:
        result.append("W")
        result.append(render_float(-coord.x))
    else:
        result.append("E")
        result.append(render_float(coord.x))
    return "".join(result)


def assign_coordinate_names(shp, missing):
    centroids = {}
    for ident in tqdm.tqdm(missing, desc="Computing centroids"):
        centroids[ident] = shp.loc[ident].geometry.centroid
    precisions = {name: 0 for name in centroids}
    while True:
        rendered = {
            ident: render_coord(coord, precisions[ident])
            for ident, coord in centroids.items()
        }
        count_rendered = Counter(rendered.values())
        duplicate_names = {name for name, count in count_rendered.items() if count > 1}
        if not duplicate_names:
            return rendered
        for ident in precisions:
            if rendered[ident] in duplicate_names:
                precisions[ident] += 1


def load_shapefile_with_data(table):
    shp = create_shapefile()
    table = table.set_index("rank").loc[shp["rank"]]
    for k in table:
        shp[k] = table[k].values

    shp = shp.set_index("id")
    return shp

def normalize(s):
    # copied from urbanstats/website_data/index.py
    s = s.lower()
    s = unicodedata.normalize("NFD", s)
    s = re.sub(r"[\u0300-\u036f]", "", s)
    return s


def valid_ascii_name(name):
    """
    Check if a name is valid ASCII.
    """
    name = normalize(name)
    return all(ord(c) < 128 for c in name) and name.strip() != ""


def near_substring(a, b):
    """
    Define A to be a near substring of B if there exists a substring B'
    of B such that len(B') = len(A) and editDist(A, B') <= 0.1 len(A)
    """
    if len(a) > len(b):
        return False
    if len(a) == 0:
        return True  # empty string is a substring of anything
    if len(b) == 0:
        return False  # non-empty string cannot be a substring of an empty string

    threshold = 0.1 * len(a)
    for i in range(len(b) - len(a) + 1):
        substring = b[i : i + len(a)]
        if SequenceMatcher(None, a, substring).ratio() * len(a) >= len(a) - threshold:
            return True
    return False


def duplicate_index(names):
    # pylint: disable=consider-using-enumerate
    for i in tqdm.trange(len(names) - 1, 0, -1, delay=5):
        for j in range(len(names)):
            if i == j:
                continue
            a, b = names[i], names[j]
            a_subset_b = near_substring(a, b)
            # pylint: disable=arguments-out-of-order
            b_subset_a = near_substring(b, a)
            if not a_subset_b and not b_subset_a:
                continue
            return min(i, j), max(i, j)
    return None


@permacache(
    "urbanstats/named_region_shapefiles/taylor-metropolitan-clusters/deduplicate_names_2"
)
def deduplicate_names(names):
    """
    Deduplicate names by checking if a name is a near substring of another.
    If it is, remove the longer one. Consolidate these to the position of the earlier
    one (higher priority) in the list.
    """
    names = names[:]
    while True:
        idxs = duplicate_index(names)
        if idxs is None:
            break
        i, j = idxs
        if len(names[i]) >= len(names[j]):
            names[i] = names[j]
        del names[j]
    return names


def remove_suffixes(name):
    for suffix in [
        " township",
        " urban area",
        " new area",
        " industrial area",
        " management area",
    ]:
        if name.lower().endswith(suffix):
            return name[: -len(suffix)]
    return name


def process_and_deduplicate_names(names):
    """
    Process names by deduplicating them and removing empty names.
    """
    names = [
        name.replace(" township", "")
        .replace(" town", "")
        .replace(" city", "")
        .replace(" urban area", "")
        for name in names
    ]

    return deduplicate_names(names)


def pull_non_city_geonames_for_missing(missing_names, curated_names):
    pulled_names = {}
    for ident in tqdm.tqdm(missing_names):
        if ident not in curated_names:
            continue
        cns = curated_names[ident]
        cns = [x for x in cns if valid_ascii_name(x[1]) if x[0] == "G"]
        if not cns:
            continue
        names = [x[1] for x in cns]
        names.sort(key=stable_hash)
        names = process_and_deduplicate_names(names)
        if not names:
            continue
        pulled_names[ident] = names
    return pulled_names


def namelist_to_name(namelist):
    return "-".join(namelist[:3])


def compute_coordinate_name(coord_name, geonames_for_missing):
    if geonames_for_missing is None:
        return coord_name
    return f"{coord_name} ({namelist_to_name(geonames_for_missing)})"


manual_overrides = {
    9767: ["Reunion"],
    16305: ["Sundance"],
    17436: ["Rita Ranch"],
    38488: ["Astumbo"],
}


def populate_osm_geonames_names(curated_names, names, source):
    for ident, cns in curated_names.items():
        cns = [x for x in cns if valid_ascii_name(x[1])]  # filter out empty names
        cns_o = [x for x in cns if x[0] == "O"]
        cns_p = [x for x in cns if x[0] == "P"]
        if cns_o:
            names[ident] = process_curated_name(cns_o)
            source[ident] = "OSM"
        elif cns_p:
            names[ident] = process_curated_name(cns_p)
            source[ident] = "Geonames"


def populate_wikidata_names(names, source, missing):
    for k, v in tqdm.tqdm(list(missing().items())):
        res = produce_name_based_on_wikidata(v)
        if res is None:
            continue
        res = [x for x in res if valid_ascii_name(x)]
        if not res:
            continue
        if re.match("^Q\\d+$", res[0]):
            raise ValueError(
                f"Got a Wikidata tag {res[0]} instead of a name for {k}. This is unexpected."
            )
        names[k] = res
        source[k] = "Wikidata"


def populate_coordinate_names(
    name_candidates, names, source, geonames_for_missing, shp
):
    coordinate_names = assign_coordinate_names(shp, name_candidates)

    for ident in set(coordinate_names) - set(names):
        if ident in geonames_for_missing:
            source[ident] = "Coordinates (with geonames backup)"
        else:
            source[ident] = "Coordinates (no geonames backup)"
        names[ident] = [
            compute_coordinate_name(
                coordinate_names[ident], geonames_for_missing.get(ident, None)
            )
        ]


def main():
    table, name_candidates, curated_names = load_metadata()

    names = {}
    source = {}
    missing = lambda: {k: v for k, v in name_candidates.items() if k not in names}
    populate_osm_geonames_names(curated_names, names, source)

    print("No Geonames/OSM names:", len(missing()))

    populate_wikidata_names(names, source, missing)

    print("No Geonames/OSM/wikidata names:", len(missing()))

    names.update(manual_overrides)
    source.update({k: "Manual Override" for k in manual_overrides if k not in source})

    print("No Geonames/OSM/wikidata/manual names:", len(missing()))

    for k in tqdm.tqdm(names, desc="Deduplicating OSM/GeoNames names"):
        new_names_k = process_and_deduplicate_names(names[k])
        assert (
            len(new_names_k) > 0
        ), f"Deduplicated names for {k} to an empty list: {names[k]}"
        names[k] = new_names_k

    geonames_for_missing = pull_non_city_geonames_for_missing(missing(), curated_names)

    shp = load_shapefile_with_data(table)

    populate_coordinate_names(name_candidates, names, source, geonames_for_missing, shp)

    shp["names"] = shp.index.map(lambda x: json.dumps(names[x]))
    shp["name"] = shp.index.map(lambda x: "-".join(names[x][:3]))
    shp["source"] = shp.index.map(lambda x: source[x])

    shp[[x for x in shp if x != "geometry"]].to_csv(
        "output/taylor_metropolitan_clusters.csv"
    )
    shp.to_file("output/taylor_metropolitan_clusters.shp.zip", driver="ESRI Shapefile")


if __name__ == "__main__":
    main()
