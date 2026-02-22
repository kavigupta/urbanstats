# pylint: skip-file
from typing import ClassVar as _ClassVar
from typing import Iterable as _Iterable
from typing import Mapping as _Mapping
from typing import Optional as _Optional
from typing import Union as _Union

from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from google.protobuf.internal import containers as _containers

DESCRIPTOR: _descriptor.FileDescriptor

class StatisticRow(_message.Message):
    __slots__ = (
        "statval",
        "ordinal_by_universe",
        "percentile_by_population_by_universe",
    )
    STATVAL_FIELD_NUMBER: _ClassVar[int]
    ORDINAL_BY_UNIVERSE_FIELD_NUMBER: _ClassVar[int]
    PERCENTILE_BY_POPULATION_BY_UNIVERSE_FIELD_NUMBER: _ClassVar[int]
    statval: float
    ordinal_by_universe: _containers.RepeatedScalarFieldContainer[int]
    percentile_by_population_by_universe: _containers.RepeatedScalarFieldContainer[int]
    def __init__(
        self,
        statval: _Optional[float] = ...,
        ordinal_by_universe: _Optional[_Iterable[int]] = ...,
        percentile_by_population_by_universe: _Optional[_Iterable[int]] = ...,
    ) -> None: ...

class FirstOrLast(_message.Message):
    __slots__ = ("article_row_idx", "article_universes_idx", "is_first")
    ARTICLE_ROW_IDX_FIELD_NUMBER: _ClassVar[int]
    ARTICLE_UNIVERSES_IDX_FIELD_NUMBER: _ClassVar[int]
    IS_FIRST_FIELD_NUMBER: _ClassVar[int]
    article_row_idx: int
    article_universes_idx: int
    is_first: bool
    def __init__(
        self,
        article_row_idx: _Optional[int] = ...,
        article_universes_idx: _Optional[int] = ...,
        is_first: bool = ...,
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

class TemperatureHistogram(_message.Message):
    __slots__ = ("counts",)
    COUNTS_FIELD_NUMBER: _ClassVar[int]
    counts: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, counts: _Optional[_Iterable[int]] = ...) -> None: ...

class ExtraStatistic(_message.Message):
    __slots__ = ("histogram", "timeseries", "temperature_histogram")
    HISTOGRAM_FIELD_NUMBER: _ClassVar[int]
    TIMESERIES_FIELD_NUMBER: _ClassVar[int]
    TEMPERATURE_HISTOGRAM_FIELD_NUMBER: _ClassVar[int]
    histogram: Histogram
    timeseries: TimeSeries
    temperature_histogram: TemperatureHistogram
    def __init__(
        self,
        histogram: _Optional[_Union[Histogram, _Mapping]] = ...,
        timeseries: _Optional[_Union[TimeSeries, _Mapping]] = ...,
        temperature_histogram: _Optional[_Union[TemperatureHistogram, _Mapping]] = ...,
    ) -> None: ...

class Metadata(_message.Message):
    __slots__ = ("metadata_index", "string_value")
    METADATA_INDEX_FIELD_NUMBER: _ClassVar[int]
    STRING_VALUE_FIELD_NUMBER: _ClassVar[int]
    metadata_index: int
    string_value: str
    def __init__(
        self, metadata_index: _Optional[int] = ..., string_value: _Optional[str] = ...
    ) -> None: ...

class Article(_message.Message):
    __slots__ = (
        "shortname",
        "longname",
        "source",
        "article_type",
        "statistic_indices_packed",
        "rows",
        "overall_first_or_last",
        "related",
        "universes",
        "extra_stats",
        "metadata",
    )
    SHORTNAME_FIELD_NUMBER: _ClassVar[int]
    LONGNAME_FIELD_NUMBER: _ClassVar[int]
    SOURCE_FIELD_NUMBER: _ClassVar[int]
    ARTICLE_TYPE_FIELD_NUMBER: _ClassVar[int]
    STATISTIC_INDICES_PACKED_FIELD_NUMBER: _ClassVar[int]
    ROWS_FIELD_NUMBER: _ClassVar[int]
    OVERALL_FIRST_OR_LAST_FIELD_NUMBER: _ClassVar[int]
    RELATED_FIELD_NUMBER: _ClassVar[int]
    UNIVERSES_FIELD_NUMBER: _ClassVar[int]
    EXTRA_STATS_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    shortname: str
    longname: str
    source: str
    article_type: str
    statistic_indices_packed: bytes
    rows: _containers.RepeatedCompositeFieldContainer[StatisticRow]
    overall_first_or_last: _containers.RepeatedCompositeFieldContainer[FirstOrLast]
    related: _containers.RepeatedCompositeFieldContainer[RelatedButtons]
    universes: _containers.RepeatedScalarFieldContainer[str]
    extra_stats: _containers.RepeatedCompositeFieldContainer[ExtraStatistic]
    metadata: _containers.RepeatedCompositeFieldContainer[Metadata]
    def __init__(
        self,
        shortname: _Optional[str] = ...,
        longname: _Optional[str] = ...,
        source: _Optional[str] = ...,
        article_type: _Optional[str] = ...,
        statistic_indices_packed: _Optional[bytes] = ...,
        rows: _Optional[_Iterable[_Union[StatisticRow, _Mapping]]] = ...,
        overall_first_or_last: _Optional[
            _Iterable[_Union[FirstOrLast, _Mapping]]
        ] = ...,
        related: _Optional[_Iterable[_Union[RelatedButtons, _Mapping]]] = ...,
        universes: _Optional[_Iterable[str]] = ...,
        extra_stats: _Optional[_Iterable[_Union[ExtraStatistic, _Mapping]]] = ...,
        metadata: _Optional[_Iterable[_Union[Metadata, _Mapping]]] = ...,
    ) -> None: ...

class ConsolidatedArticles(_message.Message):
    __slots__ = ("longnames", "articles", "symlink_link_names", "symlink_target_names")
    LONGNAMES_FIELD_NUMBER: _ClassVar[int]
    ARTICLES_FIELD_NUMBER: _ClassVar[int]
    SYMLINK_LINK_NAMES_FIELD_NUMBER: _ClassVar[int]
    SYMLINK_TARGET_NAMES_FIELD_NUMBER: _ClassVar[int]
    longnames: _containers.RepeatedScalarFieldContainer[str]
    articles: _containers.RepeatedCompositeFieldContainer[Article]
    symlink_link_names: _containers.RepeatedScalarFieldContainer[str]
    symlink_target_names: _containers.RepeatedScalarFieldContainer[str]
    def __init__(
        self,
        longnames: _Optional[_Iterable[str]] = ...,
        articles: _Optional[_Iterable[_Union[Article, _Mapping]]] = ...,
        symlink_link_names: _Optional[_Iterable[str]] = ...,
        symlink_target_names: _Optional[_Iterable[str]] = ...,
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

class PointSeries(_message.Message):
    __slots__ = ("coords",)
    COORDS_FIELD_NUMBER: _ClassVar[int]
    coords: _containers.RepeatedCompositeFieldContainer[Coordinate]
    def __init__(
        self, coords: _Optional[_Iterable[_Union[Coordinate, _Mapping]]] = ...
    ) -> None: ...

class ArticleOrderingList(_message.Message):
    __slots__ = ("longnames", "types")
    LONGNAMES_FIELD_NUMBER: _ClassVar[int]
    TYPES_FIELD_NUMBER: _ClassVar[int]
    longnames: _containers.RepeatedScalarFieldContainer[str]
    types: _containers.RepeatedScalarFieldContainer[int]
    def __init__(
        self,
        longnames: _Optional[_Iterable[str]] = ...,
        types: _Optional[_Iterable[int]] = ...,
    ) -> None: ...

class ArticleUniverseList(_message.Message):
    __slots__ = ("universes",)
    UNIVERSES_FIELD_NUMBER: _ClassVar[int]
    universes: _containers.RepeatedCompositeFieldContainer[Universes]
    def __init__(
        self, universes: _Optional[_Iterable[_Union[Universes, _Mapping]]] = ...
    ) -> None: ...

class SearchIndexMetadata(_message.Message):
    __slots__ = ("type", "is_usa", "is_symlink")
    TYPE_FIELD_NUMBER: _ClassVar[int]
    IS_USA_FIELD_NUMBER: _ClassVar[int]
    IS_SYMLINK_FIELD_NUMBER: _ClassVar[int]
    type: int
    is_usa: int
    is_symlink: int
    def __init__(
        self,
        type: _Optional[int] = ...,
        is_usa: _Optional[int] = ...,
        is_symlink: _Optional[int] = ...,
    ) -> None: ...

class SearchIndex(_message.Message):
    __slots__ = ("elements", "metadata")
    ELEMENTS_FIELD_NUMBER: _ClassVar[int]
    METADATA_FIELD_NUMBER: _ClassVar[int]
    elements: _containers.RepeatedScalarFieldContainer[str]
    metadata: _containers.RepeatedCompositeFieldContainer[SearchIndexMetadata]
    def __init__(
        self,
        elements: _Optional[_Iterable[str]] = ...,
        metadata: _Optional[_Iterable[_Union[SearchIndexMetadata, _Mapping]]] = ...,
    ) -> None: ...

class OrderList(_message.Message):
    __slots__ = ("order_idxs",)
    ORDER_IDXS_FIELD_NUMBER: _ClassVar[int]
    order_idxs: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, order_idxs: _Optional[_Iterable[int]] = ...) -> None: ...

class PopulationPercentileByUniverse(_message.Message):
    __slots__ = ("population_percentile",)
    POPULATION_PERCENTILE_FIELD_NUMBER: _ClassVar[int]
    population_percentile: _containers.RepeatedScalarFieldContainer[int]
    def __init__(
        self, population_percentile: _Optional[_Iterable[int]] = ...
    ) -> None: ...

class DataList(_message.Message):
    __slots__ = ("value", "population_percentile_by_universe")
    VALUE_FIELD_NUMBER: _ClassVar[int]
    POPULATION_PERCENTILE_BY_UNIVERSE_FIELD_NUMBER: _ClassVar[int]
    value: _containers.RepeatedScalarFieldContainer[float]
    population_percentile_by_universe: _containers.RepeatedCompositeFieldContainer[
        PopulationPercentileByUniverse
    ]
    def __init__(
        self,
        value: _Optional[_Iterable[float]] = ...,
        population_percentile_by_universe: _Optional[
            _Iterable[_Union[PopulationPercentileByUniverse, _Mapping]]
        ] = ...,
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

class Universes(_message.Message):
    __slots__ = ("universe_idxs",)
    UNIVERSE_IDXS_FIELD_NUMBER: _ClassVar[int]
    universe_idxs: _containers.RepeatedScalarFieldContainer[int]
    def __init__(self, universe_idxs: _Optional[_Iterable[int]] = ...) -> None: ...

class ConsolidatedShapes(_message.Message):
    __slots__ = ("longnames", "universes", "shapes")
    LONGNAMES_FIELD_NUMBER: _ClassVar[int]
    UNIVERSES_FIELD_NUMBER: _ClassVar[int]
    SHAPES_FIELD_NUMBER: _ClassVar[int]
    longnames: _containers.RepeatedScalarFieldContainer[str]
    universes: _containers.RepeatedCompositeFieldContainer[Universes]
    shapes: _containers.RepeatedCompositeFieldContainer[Feature]
    def __init__(
        self,
        longnames: _Optional[_Iterable[str]] = ...,
        universes: _Optional[_Iterable[_Union[Universes, _Mapping]]] = ...,
        shapes: _Optional[_Iterable[_Union[Feature, _Mapping]]] = ...,
    ) -> None: ...

class QuizDataForStat(_message.Message):
    __slots__ = ("stats",)
    STATS_FIELD_NUMBER: _ClassVar[int]
    stats: _containers.RepeatedScalarFieldContainer[float]
    def __init__(self, stats: _Optional[_Iterable[float]] = ...) -> None: ...

class QuizFullData(_message.Message):
    __slots__ = ("stats",)
    STATS_FIELD_NUMBER: _ClassVar[int]
    stats: _containers.RepeatedCompositeFieldContainer[QuizDataForStat]
    def __init__(
        self, stats: _Optional[_Iterable[_Union[QuizDataForStat, _Mapping]]] = ...
    ) -> None: ...

class QuizQuestionTronche(_message.Message):
    __slots__ = (
        "geography_a",
        "geography_b",
        "stat",
        "neg_log_prob_x10_basis",
        "neg_log_prob_x10_minus_basis",
    )
    GEOGRAPHY_A_FIELD_NUMBER: _ClassVar[int]
    GEOGRAPHY_B_FIELD_NUMBER: _ClassVar[int]
    STAT_FIELD_NUMBER: _ClassVar[int]
    NEG_LOG_PROB_X10_BASIS_FIELD_NUMBER: _ClassVar[int]
    NEG_LOG_PROB_X10_MINUS_BASIS_FIELD_NUMBER: _ClassVar[int]
    geography_a: _containers.RepeatedScalarFieldContainer[int]
    geography_b: _containers.RepeatedScalarFieldContainer[int]
    stat: _containers.RepeatedScalarFieldContainer[int]
    neg_log_prob_x10_basis: int
    neg_log_prob_x10_minus_basis: _containers.RepeatedScalarFieldContainer[int]
    def __init__(
        self,
        geography_a: _Optional[_Iterable[int]] = ...,
        geography_b: _Optional[_Iterable[int]] = ...,
        stat: _Optional[_Iterable[int]] = ...,
        neg_log_prob_x10_basis: _Optional[int] = ...,
        neg_log_prob_x10_minus_basis: _Optional[_Iterable[int]] = ...,
    ) -> None: ...

class CountsByColumnCompressed(_message.Message):
    __slots__ = ("count", "count_repeat")
    COUNT_FIELD_NUMBER: _ClassVar[int]
    COUNT_REPEAT_FIELD_NUMBER: _ClassVar[int]
    count: _containers.RepeatedScalarFieldContainer[int]
    count_repeat: _containers.RepeatedScalarFieldContainer[int]
    def __init__(
        self,
        count: _Optional[_Iterable[int]] = ...,
        count_repeat: _Optional[_Iterable[int]] = ...,
    ) -> None: ...

class CountsByArticleType(_message.Message):
    __slots__ = ("article_type", "counts")
    ARTICLE_TYPE_FIELD_NUMBER: _ClassVar[int]
    COUNTS_FIELD_NUMBER: _ClassVar[int]
    article_type: _containers.RepeatedScalarFieldContainer[str]
    counts: _containers.RepeatedCompositeFieldContainer[CountsByColumnCompressed]
    def __init__(
        self,
        article_type: _Optional[_Iterable[str]] = ...,
        counts: _Optional[_Iterable[_Union[CountsByColumnCompressed, _Mapping]]] = ...,
    ) -> None: ...

class CountsByArticleUniverseAndType(_message.Message):
    __slots__ = ("universe", "counts_by_type")
    UNIVERSE_FIELD_NUMBER: _ClassVar[int]
    COUNTS_BY_TYPE_FIELD_NUMBER: _ClassVar[int]
    universe: _containers.RepeatedScalarFieldContainer[str]
    counts_by_type: _containers.RepeatedCompositeFieldContainer[CountsByArticleType]
    def __init__(
        self,
        universe: _Optional[_Iterable[str]] = ...,
        counts_by_type: _Optional[
            _Iterable[_Union[CountsByArticleType, _Mapping]]
        ] = ...,
    ) -> None: ...

class Symlinks(_message.Message):
    __slots__ = ("link_name", "target_name")
    LINK_NAME_FIELD_NUMBER: _ClassVar[int]
    TARGET_NAME_FIELD_NUMBER: _ClassVar[int]
    link_name: _containers.RepeatedScalarFieldContainer[str]
    target_name: _containers.RepeatedScalarFieldContainer[str]
    def __init__(
        self,
        link_name: _Optional[_Iterable[str]] = ...,
        target_name: _Optional[_Iterable[str]] = ...,
    ) -> None: ...

class DefaultUniverseTriple(_message.Message):
    __slots__ = ("type_idx", "stat_idx", "universe_idx")
    TYPE_IDX_FIELD_NUMBER: _ClassVar[int]
    STAT_IDX_FIELD_NUMBER: _ClassVar[int]
    UNIVERSE_IDX_FIELD_NUMBER: _ClassVar[int]
    type_idx: int
    stat_idx: int
    universe_idx: int
    def __init__(
        self,
        type_idx: _Optional[int] = ...,
        stat_idx: _Optional[int] = ...,
        universe_idx: _Optional[int] = ...,
    ) -> None: ...

class DefaultUniverseTable(_message.Message):
    __slots__ = ("most_common_universe_idx", "exceptions")
    MOST_COMMON_UNIVERSE_IDX_FIELD_NUMBER: _ClassVar[int]
    EXCEPTIONS_FIELD_NUMBER: _ClassVar[int]
    most_common_universe_idx: int
    exceptions: _containers.RepeatedCompositeFieldContainer[DefaultUniverseTriple]
    def __init__(
        self,
        most_common_universe_idx: _Optional[int] = ...,
        exceptions: _Optional[_Iterable[_Union[DefaultUniverseTriple, _Mapping]]] = ...,
    ) -> None: ...
