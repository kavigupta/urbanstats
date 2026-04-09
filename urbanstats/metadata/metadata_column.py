from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Type

from urbanstats.protobuf import data_files_pb2


class MetadataColumn(ABC):
    @abstractmethod
    def create(self, idx, value):
        pass

    @abstractmethod
    def export(self):
        pass


@dataclass
class ExternalLinkMetadata(MetadataColumn):
    site: str
    link_prefix: str
    normalizer: str = None
    show_in_metadata_table: bool = False

    def create(self, idx, value):
        return data_files_pb2.Metadata(metadata_index=idx, string_value=value)

    def export(self):
        return dict(
            site=self.site,
            link_prefix=self.link_prefix,
            normalizer=self.normalizer,
            show_in_metadata_table=self.show_in_metadata_table,
        )


@dataclass
class DisplayedMetadata(MetadataColumn):
    typ: Type
    name: str
    show_in_metadata_table: bool = True
    category: str = field(kw_only=True)
    data_credit_explanation_page: str = field(kw_only=True)

    def create(self, idx, value):
        assert isinstance(
            value, self.typ
        ), f"Expected {self.typ}, got {type(value)} for value {value}"
        assert self.typ == str
        return data_files_pb2.Metadata(metadata_index=idx, string_value=value)

    def export(self):
        return dict(
            name=self.name,
            setting_key=setting_key(self.name),
            show_in_metadata_table=self.show_in_metadata_table,
            category=self.category,
            data_credit_explanation_page=self.data_credit_explanation_page,
        )


def setting_key(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return f"show_metadata_{slug}"
