from dataclasses import dataclass
from abc import ABC, abstractmethod

from urbanstats.protobuf import data_files_pb2

class MetadataColumn(ABC):
    @abstractmethod
    def create(self, value):
        pass

@dataclass
class DisplayedMetadata:
    typ: type

    def create(self, idx, value):
        assert isinstance(value, self.typ), f"Expected {self.typ}, got {type(value)} for value {value}"
        assert self.typ == str
        return data_files_pb2.Metadata(metadata_index=idx, string_value=value)

@dataclass
class ExternalLinkMetadata:
    def create(self, idx, value):
        return data_files_pb2.Metadata(metadata_index=idx, string_value=value)

metadata_types = {
    "geoid": DisplayedMetadata(str),
    "scgc": DisplayedMetadata(str),
    "wikidata": ExternalLinkMetadata(),
    "wikipedia_page": ExternalLinkMetadata(),
    "iso": DisplayedMetadata(str),
}
