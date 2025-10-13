from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Type

from urbanstats.protobuf import data_files_pb2


class MetadataColumn(ABC):
    @abstractmethod
    def create(self, idx, value):
        pass


@dataclass
class DisplayedMetadata(MetadataColumn):
    typ: Type
    name: str

    def create(self, idx, value):
        assert isinstance(
            value, self.typ
        ), f"Expected {self.typ}, got {type(value)} for value {value}"
        assert self.typ == str
        return data_files_pb2.Metadata(metadata_index=idx, string_value=value)


@dataclass
class ExternalLinkMetadata(MetadataColumn):
    site: str
    link_prefix: str
    normalizer: str = None

    def create(self, idx, value):
        return data_files_pb2.Metadata(metadata_index=idx, string_value=value)


metadata_types = {
    "geoid": DisplayedMetadata(str, "US Census GeoID"),
    "scgc": DisplayedMetadata(str, "StatCan GeoCode"),
    "wikidata": ExternalLinkMetadata("Wikidata", "https://www.wikidata.org/wiki/"),
    "wikipedia_page": ExternalLinkMetadata(
        "Wikipedia", "https://en.wikipedia.org/wiki/", normalizer="wikipedia"
    ),
    "iso": DisplayedMetadata(str, "ISO Code"),
}


def export_metadata_types():
    displayed_metadata = []
    external_link_metadata = []
    for i, v in enumerate(metadata_types.values()):
        if isinstance(v, DisplayedMetadata):
            displayed_metadata.append(
                dict(
                    index=i,
                    name=v.name,
                )
            )
        elif isinstance(v, ExternalLinkMetadata):
            external_link_metadata.append(
                dict(
                    index=i,
                    site=v.site,
                    link_prefix=v.link_prefix,
                    normalizer=v.normalizer,
                )
            )
        else:
            raise ValueError(f"Unknown metadata type: {type(v)}")
    return {
        "displayed_metadata": displayed_metadata,
        "external_link_metadata": external_link_metadata,
    }
