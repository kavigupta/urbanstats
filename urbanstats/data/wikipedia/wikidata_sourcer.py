from abc import ABC, abstractmethod

from attr import dataclass
from permacache import permacache
import tqdm.auto as tqdm

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

    def compute_wikidata(self, value):
        return query_sparlql(self.sparql_column, value)


@permacache(
    "urbanstats/data/wikipedia/wikidata_sourcer/compute_wikidata_and_wikipedia",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_wikidata_and_wikipedia(shapefile, sourcer: WikidataSourcer):
    table = shapefile.load_file()
    wikidata = [
        sourcer.compute_wikidata(*[row[c] for c in sourcer.columns()])
        for _, row in tqdm.tqdm(
            table.iterrows(), total=len(table), delay=5, desc="Wikidata"
        )
    ]
    wikipedia = [wikidata_to_wikipage(wikidata_id) for wikidata_id in wikidata]
    return wikidata, wikipedia


CANADA_WIKIDATA_SOURCER = SimpleWikidataSourcer("wdt:P3012", "scgc")
