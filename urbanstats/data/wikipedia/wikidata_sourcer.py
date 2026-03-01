from abc import ABC, abstractmethod
from typing import Protocol

import geopandas as gpd
import tqdm.auto as tqdm
from attr import dataclass
from permacache import permacache

from urbanstats.data.wikipedia.wikidata import query_sparlql, wikidata_to_wikipage


class ShapefileLike(Protocol):
    """Protocol for shapefile objects that can be used with compute_wikidata_and_wikipedia."""

    def load_file(self) -> gpd.GeoDataFrame: ...

    hash_key: str


class WikidataSourcer(ABC):
    @abstractmethod
    def columns(self) -> list[str]:
        pass

    @abstractmethod
    def compute_wikidata(self, *args: str) -> str | None:
        pass


@dataclass
class SimpleWikidataSourcer(WikidataSourcer):
    sparql_column: str
    input_column: str

    def columns(self) -> list[str]:
        return [self.input_column]

    # pylint: disable=arguments-differ
    def compute_wikidata(self, *args: str) -> str | None:
        (value,) = args
        return query_sparlql(self.sparql_column, value)


@permacache(
    "urbanstats/data/wikipedia/wikidata_sourcer/compute_wikidata_and_wikipedia",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_wikidata_and_wikipedia(
    shapefile: ShapefileLike, sourcer: WikidataSourcer
) -> tuple[list[str | None], list[str | None]]:
    table = shapefile.load_file()
    wikidata: list[str | None] = [
        sourcer.compute_wikidata(*[str(row[c]) for c in sourcer.columns()])
        for _, row in tqdm.tqdm(
            table.iterrows(), total=len(table), delay=5, desc="Wikidata"
        )
    ]
    wikipedia: list[str | None] = [
        wikidata_to_wikipage(wikidata_id)
        for wikidata_id in tqdm.tqdm(
            wikidata, total=len(wikidata), delay=5, desc="Wikipedia"
        )
    ]
    return wikidata, wikipedia


CANADA_WIKIDATA_SOURCER = SimpleWikidataSourcer("wdt:P3012", "scgc")
