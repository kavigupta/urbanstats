from abc import ABC, abstractmethod
from dataclasses import dataclass
import re
from typing import Optional, Type

from urbanstats.protobuf import data_files_pb2


class MetadataColumn(ABC):
    @abstractmethod
    def create(self, idx, value):
        pass


def default_setting_key(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return f"show_metadata_{slug}"


@dataclass
class DisplayedMetadata(MetadataColumn):
    typ: Type
    name: str
    setting_key: Optional[str] = None
    show_in_metadata_table: bool = True

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
    show_in_metadata_table: bool = False

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
            setting_key = v.setting_key or default_setting_key(v.name)
            displayed_metadata.append(
                dict(
                    index=i,
                    name=v.name,
                    setting_key=setting_key,
                    show_in_metadata_table=v.show_in_metadata_table,
                )
            )
        elif isinstance(v, ExternalLinkMetadata):
            external_link_metadata.append(
                dict(
                    index=i,
                    site=v.site,
                    link_prefix=v.link_prefix,
                    normalizer=v.normalizer,
                    show_in_metadata_table=v.show_in_metadata_table,
                )
            )
        else:
            raise ValueError(f"Unknown metadata type: {type(v)}")
    return {
        "displayed_metadata": displayed_metadata,
        "external_link_metadata": external_link_metadata,
    }
