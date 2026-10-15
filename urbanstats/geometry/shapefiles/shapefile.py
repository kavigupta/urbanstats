import pickle
from collections import defaultdict
from typing import Optional

import attr
import geopandas as gpd
import pandas as pd

from urbanstats.geometry.shapefiles.cross_source_borders import CrossSourceBorders


@attr.s(frozen=True)
class Geometry:
    """
    Which regions there are and their shapes, in the order load_file returns them.

    drop_dup finds duplicates by longname, so where it is set, the rows also depend on Naming.
    """

    key = attr.ib()
    path = attr.ib()
    filter = attr.ib()
    drop_dup = attr.ib(default=False)
    chunk_size = attr.ib(default=None)


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


@attr.s(frozen=True)
class Metadata:
    meta = attr.ib()
    does_overlap_self = attr.ib()
    abbreviation = attr.ib()
    data_credit = attr.ib()
    include_in_syau = attr.ib()
    wikidata_sourcer = attr.ib()


def _from_layer(layer, name):
    return property(lambda self: getattr(getattr(self, layer), name))


@attr.s
class Shapefile:
    geometry = attr.ib()
    # vulture: ignore -- read through _from_layer
    naming = attr.ib()
    metadata = attr.ib()
    universe_provider = attr.ib()
    # vulture: ignore -- read through _from_layer
    temporal = attr.ib(default=attr.Factory(Temporal))
    # vulture: ignore -- read through _from_layer
    identifiers = attr.ib(default=attr.Factory(Identifiers))
    special_data_sources = attr.ib(default=attr.Factory(dict))
    # Optional[SourceCountries], for shapefiles with regions a source country's statistics cover
    source_countries = attr.ib(default=None)
    cross_source_borders: Optional[CrossSourceBorders] = attr.ib(default=None)

    # the attributes from before shapefiles were split into layers
    hash_key = _from_layer("geometry", "key")
    path = _from_layer("geometry", "path")
    filter = _from_layer("geometry", "filter")
    drop_dup = _from_layer("geometry", "drop_dup")
    chunk_size = _from_layer("geometry", "chunk_size")
    start_date = _from_layer("temporal", "start_date")
    start_date_overall = _from_layer("temporal", "start_date_overall")
    end_date = _from_layer("temporal", "end_date")
    end_date_overall = _from_layer("temporal", "end_date_overall")
    additional_columns_computer = _from_layer(
        "identifiers", "additional_columns_computer"
    )
    intermediate_computation_columns = _from_layer(
        "identifiers", "intermediate_computation_columns"
    )
    shortname_extractor = _from_layer("naming", "shortname_extractor")
    longname_extractor = _from_layer("naming", "longname_extractor")
    cleanname_extractor = _from_layer("naming", "cleanname_extractor")
    longname_sans_date_extractor = _from_layer("naming", "longname_sans_date_extractor")
    meta = _from_layer("metadata", "meta")
    does_overlap_self = _from_layer("metadata", "does_overlap_self")
    abbreviation = _from_layer("metadata", "abbreviation")
    data_credit = _from_layer("metadata", "data_credit")
    include_in_syau = _from_layer("metadata", "include_in_syau")
    wikidata_sourcer = _from_layer("metadata", "wikidata_sourcer")

    def load_file(self):
        """
        Load the shapefile and apply the filters and extractors.

        This has a circular dependency with the deduplicate_longnames module, which
        needs to load other shapefiles to figure out how to disambiguate duplicated
        longnames.

        This should be the only circular dependency related to shapefiles.
        """
        # pylint: disable=import-outside-toplevel,cyclic-import,too-many-branches
        from urbanstats.special_cases.deduplicate_longnames import drop_duplicate

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
            s = self.path()
        s = s[s.apply(self.filter, axis=1)]
        if s.shape[0] == 0:
            raise EmptyShapefileError
        for k, v in self.additional_columns_computer.items():
            s[k] = s.apply(v, axis=1)

        if self.start_date is not None:
            assert self.longname_sans_date_extractor is not None
            s["start_date"] = s.apply(self.start_date, axis=1)
        else:
            s["start_date"] = -float("inf")

        if self.end_date is not None:
            assert self.longname_sans_date_extractor is not None
            s["end_date"] = s.apply(self.end_date, axis=1)
        else:
            s["end_date"] = float("inf")

        assert self.start_date_overall == min(
            s.start_date
        ), f"{self.start_date_overall} != {min(s.start_date)}"

        assert self.end_date_overall == max(
            s.end_date
        ), f"{self.end_date_overall} != {max(s.end_date)}"

        s["shortname"] = s.apply(self.shortname_extractor, axis=1)
        s["cleanname"] = (
            s["shortname"]
            if self.cleanname_extractor is None
            else s.apply(self.cleanname_extractor, axis=1)
        )
        s["longname"] = s.apply(self.longname_extractor, axis=1)
        if self.longname_sans_date_extractor is not None:
            s["longname_sans_date"] = s.apply(self.longname_sans_date_extractor, axis=1)
        else:
            s["longname_sans_date"] = None
        s = gpd.GeoDataFrame(
            {col: s[col] for col in self.available_columns(include_intermediates=True)},
            geometry=s.geometry,
        )
        if self.drop_dup:
            assert self.longname_sans_date_extractor is None, "Currently not supported"
            longname_to_indices = (
                s["longname"]
                .reset_index(drop=True)
                .reset_index()
                .groupby("longname")["index"]
                .apply(list)
                .to_dict()
            )
            duplicates = {k: v for k, v in longname_to_indices.items() if len(v) > 1}
            if self.drop_dup is True:
                s = s[s.longname.apply(lambda x: x not in duplicates)]
            else:
                s = drop_duplicate(s, duplicates, self.drop_dup)
        if s.crs is None:
            s.crs = "EPSG:4326"
        s = s.to_crs("EPSG:4326")
        # Handles both situations where longname_sans_date_extractor is None
        # (we do this here so we can get the updated longnames)
        # and ones where it produces NaNs for some entries (we want to fill those with longname)
        s.longname_sans_date = s.longname_sans_date.fillna(s.longname)
        return s

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
        return self.source_countries.localized_type_names(self.meta["type"])

    def available_columns(self, *, include_intermediates):
        return [
            "longname",
            "shortname",
            "cleanname",
            "longname_sans_date",
            "start_date",
            "end_date",
            *self.additional_columns_computer,
            *(self.intermediate_computation_columns if include_intermediates else []),
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
    hash_key,
    path,
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
    drop_dup=False,
    chunk_size=None,
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
    return Shapefile(
        geometry=Geometry(
            key=hash_key,
            path=path,
            filter=filter,
            drop_dup=drop_dup,
            chunk_size=chunk_size,
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
        ),
        metadata=Metadata(
            meta=meta,
            does_overlap_self=does_overlap_self,
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
    # type_to_data_credit = {
    #     x.meta["type"]: (
    #         x.data_credit if isinstance(x.data_credit, list) else [x.data_credit]
    #     )
    #     for x in ordered_shapefiles.values()
    # }
    types = []
    all_credits = []
    for sf in ordered_shapefiles:
        name = sf.meta["type"]
        cs = sf.data_credit if isinstance(sf.data_credit, list) else [sf.data_credit]
        cs = [{"text": None, **u} for u in cs]
        if cs in all_credits:
            types[all_credits.index(cs)].append(name)
            continue
        types.append([name])
        all_credits.append(cs)

    return [
        dict(names=name, dataCredits=credit) for name, credit in zip(types, all_credits)
    ]
