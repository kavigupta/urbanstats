import pickle
from collections import defaultdict
from typing import Iterable, Protocol

import attr
import geopandas as gpd
import pandas as pd

from urbanstats.metadata import metadata_types


class ShapefileTable(Protocol):
    """Table returned by Shapefile.load_file(), with longname and subnational codes."""

    longname: Iterable[str]
    subnationals_ISO_CODE: Iterable[Iterable[str]]


@attr.s
class Shapefile:
    hash_key = attr.ib()
    path = attr.ib()
    shortname_extractor = attr.ib()
    longname_extractor = attr.ib()
    filter = attr.ib()
    meta = attr.ib()
    does_overlap_self = attr.ib()
    additional_columns_computer = attr.ib(default=attr.Factory(dict))
    additional_columns_to_keep = attr.ib(default=())
    drop_dup = attr.ib(default=False)
    chunk_size = attr.ib(default=None)
    special_data_sources = attr.ib(default=attr.Factory(dict))
    universe_provider = attr.ib(kw_only=True)
    subset_masks = attr.ib(default=attr.Factory(dict))
    abbreviation = attr.ib(kw_only=True)
    data_credit = attr.ib(kw_only=True)
    start_date = attr.ib(kw_only=True, default=None)
    start_date_overall = attr.ib(kw_only=True, default=-float("inf"))
    end_date = attr.ib(kw_only=True, default=None)
    end_date_overall = attr.ib(kw_only=True, default=float("inf"))
    longname_sans_date_extractor = attr.ib(kw_only=True, default=None)
    include_in_syau = attr.ib(kw_only=True)
    metadata_columns = attr.ib(kw_only=True, default=())
    wikidata_sourcer = attr.ib(kw_only=True)

    def __attrs_post_init__(self):
        assert set(self.metadata_columns) <= set(self.available_columns)
        assert set(self.metadata_columns) <= set(metadata_types)

    def load_file(self):
        """
        Load the shapefile and apply the filters and extractors.

        This has a circular dependency with the deduplicate_longnames module, which
        needs to load other shapefiles to figure out how to disambiguate duplicated
        longnames.

        This should be the only circular dependency related to shapefiles.
        """
        # pylint: disable=import-outside-toplevel,cyclic-import,too-many-branches
        from urbanstats.special_cases.deduplicate_longnames import drop_duplicate

        if isinstance(self.path, list):
            s = gpd.GeoDataFrame(pd.concat([gpd.read_file(p) for p in self.path]))
            s = s.reset_index(drop=True)
        elif isinstance(self.path, str):
            if self.path.endswith(".pkl"):
                with open(self.path, "rb") as f:
                    s = pickle.load(f).reset_index(drop=True)
            else:
                s = gpd.read_file(self.path)
        else:
            s = self.path()
        s = s[s.apply(self.filter, axis=1)]
        if s.shape[0] == 0:
            raise EmptyShapefileError
        for subset_name, subset in self.subset_masks.items():
            subset.mutate_table(subset_name, s)
        for k, v in self.additional_columns_computer.items():
            s[k] = s.apply(v, axis=1)

        if self.start_date is not None:
            assert self.longname_sans_date_extractor is not None
            s["start_date"] = s.apply(self.start_date, axis=1)
        else:
            s["start_date"] = -float("inf")

        if self.end_date is not None:
            assert self.longname_sans_date_extractor is not None
            s["end_date"] = s.apply(self.end_date, axis=1)
        else:
            s["end_date"] = float("inf")

        assert self.start_date_overall == min(
            s.start_date
        ), f"{self.start_date_overall} != {min(s.start_date)}"

        assert self.end_date_overall == max(
            s.end_date
        ), f"{self.end_date_overall} != {max(s.end_date)}"

        s = gpd.GeoDataFrame(
            {
                "shortname": s.apply(self.shortname_extractor, axis=1),
                "longname": s.apply(self.longname_extractor, axis=1),
                "longname_sans_date": (
                    s.apply(self.longname_sans_date_extractor, axis=1)
                    if self.longname_sans_date_extractor is not None
                    else None
                ),
                **{col: s[col] for col in self.available_columns},
            },
            geometry=s.geometry,
        )
        if self.drop_dup:
            assert self.longname_sans_date_extractor is None, "Currently not supported"
            longname_to_indices = (
                s["longname"]
                .reset_index(drop=True)
                .reset_index()
                .groupby("longname")["index"]
                .apply(list)
                .to_dict()
            )
            duplicates = {k: v for k, v in longname_to_indices.items() if len(v) > 1}
            if self.drop_dup is True:
                s = s[s.longname.apply(lambda x: x not in duplicates)]
            else:
                s = drop_duplicate(s, duplicates, self.drop_dup)
        if s.crs is None:
            s.crs = "EPSG:4326"
        s = s.to_crs("EPSG:4326")
        s.longname_sans_date = s.longname_sans_date.fillna(s.longname)
        return s

    def subset_shapefile(self, subset_name):
        subset = self.subset_masks[subset_name]
        return subset.apply_to_shapefile(subset_name, self)

    @property
    def subset_mask_keys(self):
        return [subset_mask_key(k) for k in self.subset_masks]

    def localized_type_names(self):
        return {
            subset_name: subset.localized_type_names(self.meta["type"])
            for subset_name, subset in self.subset_masks.items()
        }

    @property
    def available_columns(self):
        return [
            "start_date",
            "end_date",
            *self.additional_columns_computer,
            *self.additional_columns_to_keep,
            *self.subset_mask_keys,
        ]

    @property
    def census_levels(self):
        return [
            x[1]
            for x in self.special_data_sources
            if isinstance(x, tuple) and x[0] == "census"
        ]


def subset_mask_key(subset_name):
    return f"subset_mask_{subset_name}"


class EmptyShapefileError(Exception):
    pass


def multiple_localized_type_names(shapefiles):
    localized = defaultdict(dict)
    for sf in shapefiles.values():
        for subset_name, subset_localized in sf.localized_type_names().items():
            localized[subset_name].update(subset_localized)
    return localized


def compute_data_credits(ordered_shapefiles):
    # type_to_data_credit = {
    #     x.meta["type"]: (
    #         x.data_credit if isinstance(x.data_credit, list) else [x.data_credit]
    #     )
    #     for x in ordered_shapefiles.values()
    # }
    types = []
    all_credits = []
    for sf in ordered_shapefiles:
        name = sf.meta["type"]
        cs = sf.data_credit if isinstance(sf.data_credit, list) else [sf.data_credit]
        cs = [{"text": None, **u} for u in cs]
        if cs in all_credits:
            types[all_credits.index(cs)].append(name)
            continue
        types.append([name])
        all_credits.append(cs)

    return [
        dict(names=name, dataCredits=credit) for name, credit in zip(types, all_credits)
    ]
