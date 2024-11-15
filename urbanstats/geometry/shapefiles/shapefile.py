from dataclasses import dataclass
import pickle
from typing import Callable

import attr
import geopandas as gpd
import pandas as pd


@dataclass
class SubsetSpecification:
    name_in_subset: str
    subset_filter: Callable[[gpd.GeoSeries], bool]


@attr.s
class Shapefile:
    hash_key = attr.ib()
    path = attr.ib()
    shortname_extractor = attr.ib()
    longname_extractor = attr.ib()
    filter = attr.ib()
    meta = attr.ib()
    additional_columns_to_keep = attr.ib(default=())
    drop_dup = attr.ib(default=False)
    chunk_size = attr.ib(default=None)
    american = attr.ib(default=True)
    include_in_gpw = attr.ib(default=False)
    tolerate_no_state = attr.ib(default=False)
    universe_provider = attr.ib(kw_only=True)
    subset_masks = attr.ib(default=attr.Factory(dict))

    def load_file(self):
        """
        Load the shapefile and apply the filters and extractors.

        This has a circular dependency with the deduplicate_longnames module, which
        needs to load other shapefiles to figure out how to disambiguate duplicated
        longnames.

        This should be the only circular dependency related to shapefiles.
        """
        # pylint: disable=import-outside-toplevel,cyclic-import
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
            s[self.subset_mask_key(subset_name)] = s.apply(subset.subset_filter, axis=1)
        s = gpd.GeoDataFrame(
            {
                "shortname": s.apply(self.shortname_extractor, axis=1),
                "longname": s.apply(self.longname_extractor, axis=1),
                **{
                    col: s[col]
                    for col in [
                        *self.additional_columns_to_keep,
                        *self.subset_mask_keys,
                    ]
                },
            },
            geometry=s.geometry,
        )
        if self.drop_dup:
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
        return s

    def subset_shapefile(self, subset_name):
        new_filter = lambda x: self.filter(x) and self.subset_masks[
            subset_name
        ].subset_filter(x)
        return attr.evolve(
            self, filter=new_filter, hash_key=f"{self.hash_key}_{subset_name}"
        )

    @property
    def subset_mask_keys(self):
        return [self.subset_mask_key(k) for k in self.subset_masks]

    def subset_mask_key(self, subset_name):
        return f"subset_mask_{subset_name}"


class EmptyShapefileError(Exception):
    pass
