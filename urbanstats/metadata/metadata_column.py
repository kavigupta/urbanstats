from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Type

from urbanstats.protobuf import data_files_pb2


class MetadataColumn(ABC):
    @abstractmethod
    def create(self, idx, value):
        pass


@dataclass
class ExternalLinkMetadata(MetadataColumn):
    site: str
    link_prefix: str
    normalizer: str = None
    show_in_metadata_table: bool = False

    def create(self, idx, value):
        return data_files_pb2.Metadata(metadata_index=idx, string_value=value)


@dataclass
class DisplayedMetadata(MetadataColumn):
    typ: Type
    name: str
    setting_key: Optional[str] = None
    show_in_metadata_table: bool = True
    category: str = field(kw_only=True)
    data_credit_explanation_page: str = field(kw_only=True)

    def create(self, idx, value):
        assert isinstance(
            value, self.typ
        ), f"Expected {self.typ}, got {type(value)} for value {value}"
        assert self.typ == str
        return data_files_pb2.Metadata(metadata_index=idx, string_value=value)
