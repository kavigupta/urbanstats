from dataclasses import dataclass
from typing import Any, List

from abc import ABC, abstractmethod


@dataclass(frozen=True)
class MetadataColumnResult:
    key: str
    values: List[Any]


class MetadataColumnProvider(ABC):
    @abstractmethod
    def compute_metadata_columns(self, *, shapefile, shapefiles, shapefile_table):
        pass

    def __permacache_hash__(self):
        return (self.__class__.__name__, getattr(self, "version", None))
