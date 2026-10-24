from abc import ABC, abstractmethod

import tqdm.auto as tqdm
from attr import dataclass
from permacache import permacache, stable_hash

from urbanstats.data.wikipedia.wikidata import query_sparlql, wikidata_to_wikipage


class WikidataSourcer(ABC):
    @abstractmethod
    def columns(self):
        pass

    @abstractmethod
    def compute_wikidata(self, *args):
        pass


@dataclass
class SimpleWikidataSourcer(WikidataSourcer):
    sparql_column: str
    input_column: str

    def columns(self):
        return [self.input_column]

    # pylint: disable=arguments-differ
    def compute_wikidata(self, value):
        return query_sparlql(self.sparql_column, value)


@permacache(
    "urbanstats/data/wikipedia/wikidata_sourcer/compute_wikidata_and_wikipedia",
    key_function=dict(values=stable_hash),
)
def compute_wikidata_and_wikipedia(values, sourcer: WikidataSourcer):
    """values has a tuple of the sourcer's columns for each region."""
    wikidata = [
        sourcer.compute_wikidata(*row)
        for row in tqdm.tqdm(values, total=len(values), delay=5, desc="Wikidata")
    ]
    wikipedia = [
        wikidata_to_wikipage(wikidata_id)
        for wikidata_id in tqdm.tqdm(
            wikidata, total=len(wikidata), delay=5, desc="Wikipedia"
        )
    ]
    return wikidata, wikipedia


CANADA_WIKIDATA_SOURCER = SimpleWikidataSourcer("wdt:P3012", "scgc")
