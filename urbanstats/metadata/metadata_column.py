import math
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, Type

from urbanstats.protobuf import data_files_pb2


class MetadataColumn(ABC):
    @abstractmethod
    def create(self, idx, value, representative_table_builder=None):
        pass


@dataclass
class ExternalLinkMetadata(MetadataColumn):
    site: str
    link_prefix: str
    normalizer: str = None
    show_in_metadata_table: bool = False

    def create(self, idx, value, representative_table_builder=None):
        return data_files_pb2.Metadata(metadata_index=idx, string_value=value)


@dataclass
class DisplayedMetadata(MetadataColumn):
    typ: Type
    name: str
    setting_key: Optional[str] = None
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


def normalize_optional_string(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value)
    if text in {"", "<NA>", "nan", "None"}:
        return None
    return text


def congressional_representative_key(representative):
    return (
        normalize_optional_string(representative.name) or "",
        normalize_optional_string(representative.wikipedia_page),
        normalize_optional_string(representative.party),
    )


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
