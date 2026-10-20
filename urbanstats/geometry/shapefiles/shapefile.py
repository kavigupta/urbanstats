import pickle
from collections import defaultdict
from typing import Optional

import attr
import geopandas as gpd
import pandas as pd
from permacache import stable_hash

from urbanstats.geometry.shapefiles.cross_source_borders import CrossSourceBorders
from urbanstats.geometry.shapefiles.row_functions import TableFunction


@attr.s(frozen=True)
class Geometry:
    """Which regions there are and their shapes, in the order load_file returns them."""

    key = attr.ib()
    path = attr.ib()
    filter = attr.ib()
    does_overlap_self = attr.ib()
    # layers of other shapefiles, which path is called with
    inputs = attr.ib(default=())

    def __permacache_hash__(self):
        # path and filter are functions, which stable_hash can't hash, so the key stands in for them
        if not self.inputs:
            return self.key
        return [self.key, stable_hash(self.inputs)]

    def load_rows(self):
        """
        The regions: the loaded file after the filter, with its own columns, in EPSG:4326.
        Shapefile.load_file's rows and index are the same.
        """
        assert not self.inputs or callable(self.path)
        if isinstance(self.path, list):
            s = gpd.GeoDataFrame(pd.concat([gpd.read_file(p) for p in self.path]))
            s = s.reset_index(drop=True)
        elif isinstance(self.path, str):
            if self.path.endswith(".pkl"):
                with open(self.path, "rb") as f:
                    s = pickle.load(f).reset_index(drop=True)
            else:
                s = gpd.read_file(self.path)
        else:
            s = self.path(*self.inputs)
        s = s[s.apply(self.filter, axis=1)]
        if s.shape[0] == 0:
            raise EmptyShapefileError
        s = gpd.GeoDataFrame(s, geometry="geometry")
        if s.crs is None:
            s = s.set_crs("EPSG:4326")
        return s.to_crs("EPSG:4326")


@attr.s(frozen=True)
class Temporal:
    start_date = attr.ib(default=None)
    start_date_overall = attr.ib(default=-float("inf"))
    end_date = attr.ib(default=None)
    end_date_overall = attr.ib(default=float("inf"))


@attr.s(frozen=True)
class Identifiers:
    """Columns that identify regions in other datasets, e.g. geoid."""

    additional_columns_computer = attr.ib(default=attr.Factory(dict))
    # Used in computation of additional_columns, wikidata, etc.
    intermediate_computation_columns = attr.ib(default=())


@attr.s(frozen=True)
class Naming:
    shortname_extractor = attr.ib()
    longname_extractor = attr.ib()
    # The colloquial name, without what kind of region it is or what it is within, e.g.
    # "Los Angeles" for "Los Angeles County". Defaults to the shortname.
    cleanname_extractor = attr.ib(default=None)
    longname_sans_date_extractor = attr.ib(default=None)
    # Optional[Names], whose regions tell duplicated longnames apart
    disambiguate_with = attr.ib(default=None)


@attr.s(frozen=True)
class Metadata:
    meta = attr.ib()
    abbreviation = attr.ib()
    data_credit = attr.ib()
    include_in_syau = attr.ib()
    wikidata_sourcer = attr.ib()


def extract(extractor, rows):
    if isinstance(extractor, TableFunction):
        return extractor(rows)
    return rows.apply(extractor, axis=1)


NAME_COLUMNS = ["longname", "shortname", "cleanname", "longname_sans_date"]
DATE_COLUMNS = ["start_date", "end_date"]


@attr.s(frozen=True)
class Names:
    geometry = attr.ib()
    naming = attr.ib()

    def load(self):
        return self.load_from_rows(self.geometry.load_rows())

    def load_from_rows(self, rows):
        """The NAME_COLUMNS and geometry of rows, which are geometry.load_rows()."""
        # pylint: disable=import-outside-toplevel,cyclic-import
        from urbanstats.special_cases.deduplicate_longnames import rename_duplicates

        s = rows.copy(deep=False)
        s["shortname"] = extract(self.naming.shortname_extractor, s)
        s["cleanname"] = (
            s["shortname"]
            if self.naming.cleanname_extractor is None
            else extract(self.naming.cleanname_extractor, s)
        )
        s["longname"] = extract(self.naming.longname_extractor, s)
        if self.naming.longname_sans_date_extractor is not None:
            s["longname_sans_date"] = extract(
                self.naming.longname_sans_date_extractor, s
            )
        else:
            s["longname_sans_date"] = None
        s = gpd.GeoDataFrame(
            {col: s[col] for col in NAME_COLUMNS},
            geometry=s.geometry,
        )
        if self.naming.disambiguate_with is not None:
            assert (
                self.naming.longname_sans_date_extractor is None
            ), "Currently not supported"
            longname_to_indices = (
                s["longname"]
                .reset_index(drop=True)
                .reset_index()
                .groupby("longname")["index"]
                .apply(list)
                .to_dict()
            )
            duplicates = {k: v for k, v in longname_to_indices.items() if len(v) > 1}
            s = rename_duplicates(s, duplicates, self.naming.disambiguate_with)
        # Handles both situations where longname_sans_date_extractor is None
        # (we do this here so we can get the updated longnames)
        # and ones where it produces NaNs for some entries (we want to fill those with longname)
        s.longname_sans_date = s.longname_sans_date.fillna(s.longname)
        return s


@attr.s(frozen=True)
class Dates:
    geometry = attr.ib()
    temporal = attr.ib()

    def load(self):
        return self.load_from_rows(self.geometry.load_rows())

    def load_from_rows(self, rows):
        """The DATE_COLUMNS of rows, which are geometry.load_rows()."""
        t = self.temporal
        result = pd.DataFrame(
            {
                "start_date": (
                    -float("inf")
                    if t.start_date is None
                    else extract(t.start_date, rows)
                ),
                "end_date": (
                    float("inf") if t.end_date is None else extract(t.end_date, rows)
                ),
            },
            index=rows.index,
        )
        assert t.start_date_overall == min(
            result.start_date
        ), f"{t.start_date_overall} != {min(result.start_date)}"
        assert t.end_date_overall == max(
            result.end_date
        ), f"{t.end_date_overall} != {max(result.end_date)}"
        return result


@attr.s(frozen=True)
class Identified:
    geometry = attr.ib()
    identifiers = attr.ib()

    def load(self):
        return self.load_from_rows(self.geometry.load_rows())

    def load_from_rows(self, rows):
        """The additional and intermediate columns of rows, which are geometry.load_rows()."""
        s = rows.copy(deep=False)
        for k, v in self.identifiers.additional_columns_computer.items():
            s[k] = extract(v, s)
        return pd.DataFrame(
            {
                col: s[col]
                for col in [
                    *self.identifiers.additional_columns_computer,
                    *self.identifiers.intermediate_computation_columns,
                ]
            },
            index=s.index,
        )


def join_layers(*layers):
    """The columns of each layer in order, then the geometry. The layers share a geometry."""
    geometry = layers[0].geometry
    assert all(layer.geometry == geometry for layer in layers)
    rows = geometry.load_rows()
    columns = {}
    for layer in layers:
        table = layer.load_from_rows(rows)
        columns.update({col: table[col] for col in table.columns if col != "geometry"})
    return gpd.GeoDataFrame(columns, geometry=rows.geometry)


@attr.s(frozen=True)
class ShapefileWithoutMetadata:
    geometry = attr.ib()
    naming = attr.ib()
    universe_provider = attr.ib()
    temporal = attr.ib()
    identifiers = attr.ib()
    special_data_sources = attr.ib()
    source_countries = attr.ib()
    cross_source_borders = attr.ib()

    @property
    def names(self):
        return Names(geometry=self.geometry, naming=self.naming)

    @property
    def dates(self):
        return Dates(geometry=self.geometry, temporal=self.temporal)

    @property
    def identified(self):
        return Identified(geometry=self.geometry, identifiers=self.identifiers)


@attr.s(hash=False)
class Shapefile:
    geometry = attr.ib()
    naming = attr.ib()
    metadata = attr.ib()
    universe_provider = attr.ib()
    temporal = attr.ib(default=attr.Factory(Temporal))
    identifiers = attr.ib(default=attr.Factory(Identifiers))
    special_data_sources = attr.ib(default=attr.Factory(dict))
    # Optional[SourceCountries], for shapefiles with regions a source country's statistics cover
    source_countries = attr.ib(default=None)
    cross_source_borders: Optional[CrossSourceBorders] = attr.ib(default=None)

    def __hash__(self):
        return hash(stable_hash(self))

    def without_metadata(self):
        return ShapefileWithoutMetadata(
            geometry=self.geometry,
            naming=self.naming,
            universe_provider=self.universe_provider,
            temporal=self.temporal,
            identifiers=self.identifiers,
            special_data_sources=self.special_data_sources,
            source_countries=self.source_countries,
            cross_source_borders=self.cross_source_borders,
        )

    @property
    def names(self):
        return self.without_metadata().names

    @property
    def dates(self):
        return self.without_metadata().dates

    @property
    def identified(self):
        return self.without_metadata().identified

    def load_file(self):
        return join_layers(self.names, self.dates, self.identified)

    @property
    def source_country_list(self):
        if self.source_countries is None:
            return ()
        return self.source_countries.countries

    def subset_shapefile(self, country):
        return self.source_countries.subset_shapefile(self, country)

    def localized_type_names(self):
        if self.source_countries is None:
            return {}
        return self.source_countries.localized_type_names(self.metadata.meta["type"])

    def available_columns(self, *, include_intermediates):
        return [
            *NAME_COLUMNS,
            *DATE_COLUMNS,
            *self.identifiers.additional_columns_computer,
            *(
                self.identifiers.intermediate_computation_columns
                if include_intermediates
                else []
            ),
        ]

    @property
    def census_levels(self):
        return [
            x[1]
            for x in self.special_data_sources
            if isinstance(x, tuple) and x[0] == "census"
        ]


# pylint: disable-next=too-many-arguments,too-many-locals
def make_shapefile(
    *,
    geometry_key,
    path,
    path_inputs=(),
    filter,  # pylint: disable=redefined-builtin
    shortname_extractor,
    longname_extractor,
    meta,
    does_overlap_self,
    universe_provider,
    abbreviation,
    data_credit,
    include_in_syau,
    wikidata_sourcer,
    disambiguate_with=None,
    start_date=None,
    start_date_overall=-float("inf"),
    end_date=None,
    end_date_overall=float("inf"),
    additional_columns_computer=None,
    intermediate_computation_columns=(),
    cleanname_extractor=None,
    longname_sans_date_extractor=None,
    special_data_sources=None,
    source_countries=None,
    cross_source_borders=None,
):
    if start_date is not None or end_date is not None:
        assert longname_sans_date_extractor is not None
    return Shapefile(
        geometry=Geometry(
            key=geometry_key,
            path=path,
            filter=filter,
            does_overlap_self=does_overlap_self,
            inputs=path_inputs,
        ),
        temporal=Temporal(
            start_date=start_date,
            start_date_overall=start_date_overall,
            end_date=end_date,
            end_date_overall=end_date_overall,
        ),
        identifiers=Identifiers(
            additional_columns_computer=(
                {}
                if additional_columns_computer is None
                else additional_columns_computer
            ),
            intermediate_computation_columns=intermediate_computation_columns,
        ),
        naming=Naming(
            shortname_extractor=shortname_extractor,
            longname_extractor=longname_extractor,
            cleanname_extractor=cleanname_extractor,
            longname_sans_date_extractor=longname_sans_date_extractor,
            disambiguate_with=disambiguate_with,
        ),
        metadata=Metadata(
            meta=meta,
            abbreviation=abbreviation,
            data_credit=data_credit,
            include_in_syau=include_in_syau,
            wikidata_sourcer=wikidata_sourcer,
        ),
        universe_provider=universe_provider,
        special_data_sources={}
        if special_data_sources is None
        else special_data_sources,
        source_countries=source_countries,
        cross_source_borders=cross_source_borders,
    )


class EmptyShapefileError(Exception):
    pass


def multiple_localized_type_names(shapefiles):
    localized = defaultdict(dict)
    for sf in shapefiles.values():
        for subset_name, subset_localized in sf.localized_type_names().items():
            localized[subset_name].update(subset_localized)
    return localized


def compute_data_credits(ordered_shapefiles):
    types = []
    all_credits = []
    for sf in ordered_shapefiles:
        name = sf.metadata.meta["type"]
        credit = sf.metadata.data_credit
        cs = credit if isinstance(credit, list) else [credit]
        cs = [{"text": None, **u} for u in cs]
        if cs in all_credits:
            types[all_credits.index(cs)].append(name)
            continue
        types.append([name])
        all_credits.append(cs)

    return [
        dict(names=name, dataCredits=credit) for name, credit in zip(types, all_credits)
    ]
