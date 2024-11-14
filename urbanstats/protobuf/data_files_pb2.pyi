#pylint: skip-file
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from typing import (
    ClassVar as _ClassVar,
    Iterable as _Iterable,
    Mapping as _Mapping,
    Optional as _Optional,
    Union as _Union,
)

DESCRIPTOR: _descriptor.FileDescriptor

class StatisticRow(_message.Message):
    __slots__ = (
        "statval",
        "ordinal_by_universe",
        "overall_ordinal_by_universe",
        "percentile_by_population_by_universe",
    )
    STATVAL_FIELD_NUMBER: _ClassVar[int]
    ORDINAL_BY_UNIVERSE_FIELD_NUMBER: _ClassVar[int]
    OVERALL_ORDINAL_BY_UNIVERSE_FIELD_NUMBER: _ClassVar[int]
    PERCENTILE_BY_POPULATION_BY_UNIVERSE_FIELD_NUMBER: _ClassVar[int]
    statval: float
    ordinal_by_universe: _containers.RepeatedScalarFieldContainer[int]
    overall_ordinal_by_universe: _containers.RepeatedScalarFieldContainer[int]
    percentile_by_population_by_universe: _containers.RepeatedScalarFieldContainer[
        float
    ]
    def __init__(
        self,
        statval: _Optional[float] = ...,
        ordinal_by_universe: _Optional[_Iterable[int]] = ...,
        overall_ordinal_by_universe: _Optional[_Iterable[int]] = ...,
        percentile_by_population_by_universe: _Optional[_Iterable[float]] = ...,
    ) -> None: ...

class RelatedButton(_message.Message):
    __slots__ = ("longname", "shortname", "row_type")
    LONGNAME_FIELD_NUMBER: _ClassVar[int]
    SHORTNAME_FIELD_NUMBER: _ClassVar[int]
    ROW_TYPE_FIELD_NUMBER: _ClassVar[int]
    longname: str
    shortname: str
    row_type: str
    def __init__(
        self,
        longname: _Optional[str] = ...,
        shortname: _Optional[str] = ...,
        row_type: _Optional[str] = ...,
    ) -> None: ...

class RelatedButtons(_message.Message):
    __slots__ = ("relationship_type", "buttons")
    RELATIONSHIP_TYPE_FIELD_NUMBER: _ClassVar[int]
    BUTTONS_FIELD_NUMBER: _ClassVar[int]
    relationship_type: str
    buttons: _containers.RepeatedCompositeFieldContainer[RelatedButton]
    def __init__(
        self,
        relationship_type: _Optional[str] = ...,
        buttons: _Optional[_Iterable[_Union[RelatedButton, _Mapping]]] = ...,
    ) -> None: ...

class Histogram(_message.Message):
    __slots__ = ("bin_min", "bin_size", "counts")
    BIN_MIN_FIELD_NUMBER: _ClassVar[int]
    BIN_SIZE_FIELD_NUMBER: _ClassVar[int]
    COUNTS_FIELD_NUMBER: _ClassVar[int]
    bin_min: float
    bin_size: float
    counts: _containers.RepeatedScalarFieldContainer[int]
    def __init__(
        self,
        bin_min: _Optional[float] = ...,
        bin_size: _Optional[float] = ...,
        counts: _Optional[_Iterable[int]] = ...,
    ) -> None: ...

class TimeSeries(_message.Message):
    __slots__ = ("values",)
    VALUES_FIELD_NUMBER: _ClassVar[int]
    values: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, values: _Optional[_Iterable[float]] = ...) -> None: ...

class ExtraStatistic(_message.Message):
    __slots__ = ("histogram", "timeseries")
    HISTOGRAM_FIELD_NUMBER: _ClassVar[int]
    TIMESERIES_FIELD_NUMBER: _ClassVar[int]
    histogram: Histogram
    timeseries: TimeSeries
    def __init__(
        self,
        histogram: _Optional[_Union[Histogram, _Mapping]] = ...,
        timeseries: _Optional[_Union[TimeSeries, _Mapping]] = ...,
    ) -> None: ...

class Article(_message.Message):
    __slots__ = (
        "shortname",
        "longname",
        "source",
        "article_type",
        "statistic_indices_packed",
        "rows",
        "related",
        "universes",
        "extra_stats",
    )
    SHORTNAME_FIELD_NUMBER: _ClassVar[int]
    LONGNAME_FIELD_NUMBER: _ClassVar[int]
    SOURCE_FIELD_NUMBER: _ClassVar[int]
    ARTICLE_TYPE_FIELD_NUMBER: _ClassVar[int]
    STATISTIC_INDICES_PACKED_FIELD_NUMBER: _ClassVar[int]
    ROWS_FIELD_NUMBER: _ClassVar[int]
    RELATED_FIELD_NUMBER: _ClassVar[int]
    UNIVERSES_FIELD_NUMBER: _ClassVar[int]
    EXTRA_STATS_FIELD_NUMBER: _ClassVar[int]
    shortname: str
    longname: str
    source: str
    article_type: str
    statistic_indices_packed: bytes
    rows: _containers.RepeatedCompositeFieldContainer[StatisticRow]
    related: _containers.RepeatedCompositeFieldContainer[RelatedButtons]
    universes: _containers.RepeatedScalarFieldContainer[str]
    extra_stats: _containers.RepeatedCompositeFieldContainer[ExtraStatistic]
    def __init__(
        self,
        shortname: _Optional[str] = ...,
        longname: _Optional[str] = ...,
        source: _Optional[str] = ...,
        article_type: _Optional[str] = ...,
        statistic_indices_packed: _Optional[bytes] = ...,
        rows: _Optional[_Iterable[_Union[StatisticRow, _Mapping]]] = ...,
        related: _Optional[_Iterable[_Union[RelatedButtons, _Mapping]]] = ...,
        universes: _Optional[_Iterable[str]] = ...,
        extra_stats: _Optional[_Iterable[_Union[ExtraStatistic, _Mapping]]] = ...,
    ) -> None: ...

class Coordinate(_message.Message):
    __slots__ = ("lon", "lat")
    LON_FIELD_NUMBER: _ClassVar[int]
    LAT_FIELD_NUMBER: _ClassVar[int]
    lon: float
    lat: float
    def __init__(
        self, lon: _Optional[float] = ..., lat: _Optional[float] = ...
    ) -> None: ...

class Ring(_message.Message):
    __slots__ = ("coords",)
    COORDS_FIELD_NUMBER: _ClassVar[int]
    coords: _containers.RepeatedCompositeFieldContainer[Coordinate]
    def __init__(
        self, coords: _Optional[_Iterable[_Union[Coordinate, _Mapping]]] = ...
    ) -> None: ...

class Polygon(_message.Message):
    __slots__ = ("rings",)
    RINGS_FIELD_NUMBER: _ClassVar[int]
    rings: _containers.RepeatedCompositeFieldContainer[Ring]
    def __init__(
        self, rings: _Optional[_Iterable[_Union[Ring, _Mapping]]] = ...
    ) -> None: ...

class MultiPolygon(_message.Message):
    __slots__ = ("polygons",)
    POLYGONS_FIELD_NUMBER: _ClassVar[int]
    polygons: _containers.RepeatedCompositeFieldContainer[Polygon]
    def __init__(
        self, polygons: _Optional[_Iterable[_Union[Polygon, _Mapping]]] = ...
    ) -> None: ...

class Feature(_message.Message):
    __slots__ = ("polygon", "multipolygon", "zones", "center_lon")
    POLYGON_FIELD_NUMBER: _ClassVar[int]
    MULTIPOLYGON_FIELD_NUMBER: _ClassVar[int]
    ZONES_FIELD_NUMBER: _ClassVar[int]
    CENTER_LON_FIELD_NUMBER: _ClassVar[int]
    polygon: Polygon
    multipolygon: MultiPolygon
    zones: _containers.RepeatedScalarFieldContainer[int]
    center_lon: float
    def __init__(
        self,
        polygon: _Optional[_Union[Polygon, _Mapping]] = ...,
        multipolygon: _Optional[_Union[MultiPolygon, _Mapping]] = ...,
        zones: _Optional[_Iterable[int]] = ...,
        center_lon: _Optional[float] = ...,
    ) -> None: ...

class StringList(_message.Message):
    __slots__ = ("elements",)
    ELEMENTS_FIELD_NUMBER: _ClassVar[int]
    elements: _containers.RepeatedScalarFieldContainer[str]
    def __init__(self, elements: _Optional[_Iterable[str]] = ...) -> None: ...

class SearchIndex(_message.Message):
    __slots__ = ("elements", "priorities")
    ELEMENTS_FIELD_NUMBER: _ClassVar[int]
    PRIORITIES_FIELD_NUMBER: _ClassVar[int]
    elements: _containers.RepeatedScalarFieldContainer[str]
    priorities: _containers.RepeatedScalarFieldContainer[int]
    def __init__(
        self,
        elements: _Optional[_Iterable[str]] = ...,
        priorities: _Optional[_Iterable[int]] = ...,
    ) -> None: ...

class OrderList(_message.Message):
    __slots__ = ("order_idxs",)
    ORDER_IDXS_FIELD_NUMBER: _ClassVar[int]
    order_idxs: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, order_idxs: _Optional[_Iterable[int]] = ...) -> None: ...

class DataList(_message.Message):
    __slots__ = ("value", "population_percentile")
    VALUE_FIELD_NUMBER: _ClassVar[int]
    POPULATION_PERCENTILE_FIELD_NUMBER: _ClassVar[int]
    value: _containers.RepeatedScalarFieldContainer[float]
    population_percentile: _containers.RepeatedScalarFieldContainer[float]
    def __init__(
        self,
        value: _Optional[_Iterable[float]] = ...,
        population_percentile: _Optional[_Iterable[float]] = ...,
    ) -> None: ...

class OrderLists(_message.Message):
    __slots__ = ("statnames", "order_lists")
    STATNAMES_FIELD_NUMBER: _ClassVar[int]
    ORDER_LISTS_FIELD_NUMBER: _ClassVar[int]
    statnames: _containers.RepeatedScalarFieldContainer[str]
    order_lists: _containers.RepeatedCompositeFieldContainer[OrderList]
    def __init__(
        self,
        statnames: _Optional[_Iterable[str]] = ...,
        order_lists: _Optional[_Iterable[_Union[OrderList, _Mapping]]] = ...,
    ) -> None: ...

class DataLists(_message.Message):
    __slots__ = ("statnames", "data_lists")
    STATNAMES_FIELD_NUMBER: _ClassVar[int]
    DATA_LISTS_FIELD_NUMBER: _ClassVar[int]
    statnames: _containers.RepeatedScalarFieldContainer[str]
    data_lists: _containers.RepeatedCompositeFieldContainer[DataList]
    def __init__(
        self,
        statnames: _Optional[_Iterable[str]] = ...,
        data_lists: _Optional[_Iterable[_Union[DataList, _Mapping]]] = ...,
    ) -> None: ...

class AllStats(_message.Message):
    __slots__ = ("stats",)
    STATS_FIELD_NUMBER: _ClassVar[int]
    stats: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, stats: _Optional[_Iterable[float]] = ...) -> None: ...

class ConsolidatedShapes(_message.Message):
    __slots__ = ("longnames", "shapes")
    LONGNAMES_FIELD_NUMBER: _ClassVar[int]
    SHAPES_FIELD_NUMBER: _ClassVar[int]
    longnames: _containers.RepeatedScalarFieldContainer[str]
    shapes: _containers.RepeatedCompositeFieldContainer[Feature]
    def __init__(
        self,
        longnames: _Optional[_Iterable[str]] = ...,
        shapes: _Optional[_Iterable[_Union[Feature, _Mapping]]] = ...,
    ) -> None: ...

class ConsolidatedStatistics(_message.Message):
    __slots__ = ("longnames", "shortnames", "stats")
    LONGNAMES_FIELD_NUMBER: _ClassVar[int]
    SHORTNAMES_FIELD_NUMBER: _ClassVar[int]
    STATS_FIELD_NUMBER: _ClassVar[int]
    longnames: _containers.RepeatedScalarFieldContainer[str]
    shortnames: _containers.RepeatedScalarFieldContainer[str]
    stats: _containers.RepeatedCompositeFieldContainer[AllStats]
    def __init__(
        self,
        longnames: _Optional[_Iterable[str]] = ...,
        shortnames: _Optional[_Iterable[str]] = ...,
        stats: _Optional[_Iterable[_Union[AllStats, _Mapping]]] = ...,
    ) -> None: ...
