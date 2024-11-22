from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Callable

import attr
import geopandas as gpd

from urbanstats.geometry.shapefiles.shapefile import subset_mask_key


class ShapefileSubset(ABC):
    @abstractmethod
    def apply_to_shapefile(self, key, sf):
        pass

    @abstractmethod
    def mutate_table(self, subset_name, s):
        pass

    @abstractmethod
    def localized_type_names(self, parent_name):
        pass


class SelfSubset(ShapefileSubset):
    def apply_to_shapefile(self, key, sf):
        return sf

    def mutate_table(self, subset_name, s):
        s[subset_mask_key(subset_name)] = True

    def localized_type_names(self, parent_name):
        return {}


@dataclass
class FilteringSubset(ShapefileSubset):
    name_in_subset: str
    subset_filter: Callable[[gpd.GeoSeries], bool]

    def apply_to_shapefile(self, key, sf):
        def new_filter(x):
            return sf.filter(x) and self.subset_filter(x)

        return attr.evolve(sf, filter=new_filter, hash_key=f"{sf.hash_key}_{key}")

    def mutate_table(self, subset_name, s):
        s[subset_mask_key(subset_name)] = s.apply(self.subset_filter, axis=1)

    def localized_type_names(self, parent_name):
        return {parent_name: self.name_in_subset}
