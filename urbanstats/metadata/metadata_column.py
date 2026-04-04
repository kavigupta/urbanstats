from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import math
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
    value_kind: str = "string"
    category: str = field(kw_only=True)
    data_credit_explanation_page: str = field(kw_only=True)

    def create(self, idx, value):
        assert isinstance(
            value, self.typ
        ), f"Expected {self.typ}, got {type(value)} for value {value}"
        assert self.typ == str
        return data_files_pb2.Metadata(metadata_index=idx, string_value=value)


@dataclass
class CongressionalRepresentativesMetadata(DisplayedMetadata):
    value_kind: str = "congressional_representatives"
    term_start_year: Optional[int] = None

    def _representatives_for_value(self, value):
        if self.term_start_year is not None and isinstance(value, dict):
            return value.get(self.term_start_year, value.get(str(self.term_start_year), []))
        return value

    def create(self, idx, value):
        representatives = self._representatives_for_value(value)
        if not representatives:
            return None

        def normalize_optional_string(v):
            if v is None:
                return None
            if isinstance(v, float) and math.isnan(v):
                return None
            text = str(v)
            if text in {"", "<NA>", "nan", "None"}:
                return None
            return text

        def representative_message(representative):
            message_kwargs = dict(name=normalize_optional_string(representative.name) or "")
            wikipedia_page = normalize_optional_string(representative.wikipedia_page)
            if wikipedia_page is not None:
                message_kwargs["wikipedia_page"] = wikipedia_page
            party = normalize_optional_string(representative.party)
            if party is not None:
                message_kwargs["party"] = party
            return data_files_pb2.CongressionalRepresentative(**message_kwargs)

        return data_files_pb2.Metadata(
            metadata_index=idx,
            congressional_representatives=data_files_pb2.CongressionalRepresentatives(
                representatives=[representative_message(representative) for representative in representatives]
            ),
        )
