import math
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import re
from typing import Optional, Type

from urbanstats.protobuf import data_files_pb2


class MetadataColumn(ABC):
    @abstractmethod
    def create(self, idx, value, representative_table_builder=None):
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

    def create(self, idx, value, representative_table_builder=None):
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
    value_kind: str = "string"
    category: str = field(kw_only=True)
    data_credit_explanation_page: str = field(kw_only=True)

    def create(self, idx, value, representative_table_builder=None):
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
            value_kind=self.value_kind,
            category=self.category,
            data_credit_explanation_page=self.data_credit_explanation_page,
        )


def setting_key(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
    return f"show_metadata_{slug}"


def normalize_optional_string(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value)
    assert text not in {"<NA>", "nan", "None"}, f"Unexpected string value: {text}"
    if not text:
        return None
    return text


def congressional_representative_proto(representative):
    message_kwargs = dict(name=normalize_optional_string(representative.name) or "")
    wikipedia_page = normalize_optional_string(representative.wikipedia_page)
    if wikipedia_page is not None:
        message_kwargs["wikipedia_page"] = wikipedia_page
    party = normalize_optional_string(representative.party)
    if party is not None:
        message_kwargs["party"] = party
    return data_files_pb2.CongressionalRepresentative(**message_kwargs)


@dataclass
class CongressionalRepresentativesMetadata(DisplayedMetadata):
    value_kind: str = "congressional_representatives"
    term_start_year: Optional[int] = None

    def _representatives_for_value(self, value):
        if self.term_start_year is not None and isinstance(value, dict):
            return value.get(
                self.term_start_year, value.get(str(self.term_start_year), [])
            )
        return value

    def create(self, idx, value, representative_table_builder=None):
        representatives = self.representative_messages(value)
        if not representatives:
            return None

        assert (
            representative_table_builder is not None
        ), "representative_table_builder is required for congressional representative metadata"

        return data_files_pb2.Metadata(
            metadata_index=idx,
            congressional_representatives=[
                representative_table_builder.index_for(representative)
                for representative in representatives
            ],
        )

    def representative_messages(self, value):
        representatives = self._representatives_for_value(value)
        return [
            congressional_representative_proto(representative)
            for representative in representatives
        ]
