from abc import ABC, abstractmethod

from attr import dataclass
from permacache import permacache

from urbanstats.data.wikipedia.wikidata import query_sparlql


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
    "urbanstats/data/wikipedia/wikidata_sourcer/compute_wikidata",
    key_function=dict(shapefile=lambda x: x.hash_key),
)
def compute_wikidata(shapefile, sourcer: WikidataSourcer):
    table = shapefile.load_file()
    return [
        sourcer.compute_wikidata(*[row[c] for c in sourcer.columns()])
        for _, row in table.iterrows()
    ]
