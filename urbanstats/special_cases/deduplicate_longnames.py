from functools import lru_cache
from permacache import permacache, stable_hash


import tqdm.auto as tqdm


def strip_suffix(name):
    if name in {
        "District of Columbia",
        "Township 1, Charlotte",
        "Township 12, Paw Creek",
    } or re.match(r"^District \d+$", name):
        return name
    suffixes = [
        " county",
        " parish",
        " borough",
        " census area",
        " municipio",
        " city",
        " planning region",
        " city-county",
        " ccd",
        " township",
        " district",
        " town",
        " barrio",
    ]
    for suffix in suffixes:
        if name.lower().endswith(suffix.lower()):
            return name[: -len(suffix)]
    raise ValueError(f"Unknown suffix in {name}")


def compute_additional_name(geometry, drop_dup_shapefile_key):
    counties_in = locate_rows(geometry, drop_dup_shapefile_key)[
        ["longname", "shortname", "overlap_pct"]
    ].copy()
    counties_in.sort_values("overlap_pct", inplace=True, ascending=False)
    account_for = 0
    relevant = []
    for _, row in counties_in.iterrows():
        relevant.append(strip_suffix(row.shortname))
        account_for += row.overlap_pct
        if account_for >= 0.99:
            break
    return "-".join(relevant)


def compute_new_longname(addtl_name, longname, shortname):
    if longname.startswith(shortname):
        new_longname = f"{shortname} ({addtl_name}){longname[len(shortname):]}"
    elif "Neighborhood" in longname:
        pre_neighborhood, post_neighborhood = longname.split(" Neighborhood")
        new_longname = (
            f"{pre_neighborhood} Neighborhood ({addtl_name}){post_neighborhood}"
        )
    else:
        raise ValueError(f"Unparseable longname {longname}")
    return new_longname


def remove_total_duplicates(s, indices):
    first_row = s.iloc[indices[0]]
    hash_geo = stable_hash(first_row.geometry.__geo_interface__)
    kept = [indices[0]]
    duplicates = []
    for idx in indices[1:]:
        if stable_hash(s.iloc[idx].geometry.__geo_interface__) == hash_geo:
            duplicates.append(idx)
        else:
            kept.append(idx)
    return kept, duplicates


def drop_duplicate(s, duplicates, drop_dup_shapefile_key):
    from urbanstats.data.circle import naive_directions_for_rows_with_names

    all_delete_indices = set()
    for longname, indices in tqdm.tqdm(list(duplicates.items())):
        indices, delete_indices = remove_total_duplicates(s, indices)
        all_delete_indices.update(delete_indices)
        if len(indices) == 1:
            continue
        addtl_name_each = [
            compute_additional_name(s.iloc[idx].geometry, drop_dup_shapefile_key)
            for idx in indices
        ]
        addtl_name_each = naive_directions_for_rows_with_names(
            s.iloc[indices], addtl_name_each
        )
        for addtl_name, idx in zip(addtl_name_each, indices):
            new_longname = compute_new_longname(
                addtl_name, longname, s.iloc[idx].shortname
            )
            s.loc[idx, "longname"] = new_longname
    s = s.drop(index=all_delete_indices).reset_index(drop=True)
    return s


@lru_cache(None)
def load_shapefile_cached(drop_dup_shapefile_key):
    from shapefiles import shapefiles

    return shapefiles[drop_dup_shapefile_key].load_file()


def shapefile_hash_key(sf_key):
    from shapefiles import shapefiles

    return shapefiles[sf_key].hash_key


@permacache(
    "stats_for_shapefile/locate_rows_3",
    key_function=dict(
        shape=lambda g: stable_hash(g.__geo_interface__),
        shapefile_key=shapefile_hash_key,
    ),
)
def locate_rows(shape, shapefile_key):
    shapefile = load_shapefile_cached(shapefile_key)
    result = shapefile[
        shapefile.apply(lambda x: x.geometry.intersects(shape), axis=1)
    ].copy()
    result["overlap_area"] = result.apply(
        lambda x: x.geometry.intersection(shape).area, axis=1
    )
    result["overlap_pct"] = result.overlap_area / shape.area
    return result