from abc import ABC, abstractmethod
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, Tuple

import attr
import pandas as pd
from permacache import permacache, stable_hash

from urbanstats.geometry.relationship_equirectangular import compute_relationships
from urbanstats.geometry.shapefiles.longnames import shapefile_longnames

# The countries whose statistics agencies are data sources
SOURCE_COUNTRIES = ("USA", "Canada", "Australia")


class SourceCountries(ABC):
    """
    Which source countries each of a shapefile's regions lies within: e.g. ("USA",) for Los Angeles,
    ("Canada", "USA") for Detroit, and None for Tijuana, which is partly in Mexico.

    A single country's statistics are computed for the regions lying within exactly that country.
    """

    @property
    @abstractmethod
    def countries(self) -> Tuple[str, ...]:
        """The source countries any region can lie within."""

    @abstractmethod
    def localized_type_names(self, parent_name) -> Dict[str, Dict[str, str]]:
        """Country -> (shapefile type -> what it is called within that country)."""

    @abstractmethod
    def by_region(self, shapefile) -> pd.Series:
        """Each region's source countries, indexed like shapefile.load_file()."""

    @abstractmethod
    def subset_shapefile(self, shapefile, country):
        """The shapefile's regions lying within exactly this country."""


@dataclass(frozen=True)
class InCountry(SourceCountries):
    """Every region lies within this country."""

    country: str

    @property
    def countries(self):
        return (self.country,)

    def localized_type_names(self, parent_name):
        return {self.country: {}}

    def by_region(self, shapefile):
        table = shapefile.load_file()
        return pd.Series([self.countries] * len(table), index=table.index)

    def subset_shapefile(self, shapefile, country):
        assert country == self.country
        return shapefile


@dataclass(frozen=True)
class VariesByRegion(SourceCountries):
    """
    `names_in_country` is what the shapefile's type is called within each source country, e.g.
    {"USA": "US Urban Center"}.
    """

    names_in_country: Dict[str, str]

    def __hash__(self):
        return hash(tuple(sorted(self.names_in_country.items())))

    @property
    def countries(self):
        return tuple(self.names_in_country)

    def localized_type_names(self, parent_name):
        return {
            country: {parent_name: name}
            for country, name in self.names_in_country.items()
        }

    # computing it reads other shapefiles, and every per-country statistic collection asks
    @lru_cache(None)  # pylint: disable=method-cache-max-size-none
    def by_region(self, shapefile):
        return self.compute_by_region(shapefile)

    @abstractmethod
    def compute_by_region(self, shapefile) -> pd.Series:
        pass

    def subset_shapefile(self, shapefile, country):
        by_region = self.by_region(shapefile)
        in_country = {i for i, cs in by_region.items() if cs == (country,)}

        def new_filter(row):
            return shapefile.geometry.filter(row) and row.name in in_country

        # cached per-country results line up with the subset's rows, so a subset with different
        # regions needs a different key
        regions = stable_hash(sorted(in_country))[:8]
        return attr.evolve(
            shapefile,
            geometry=attr.evolve(
                shapefile.geometry,
                filter=new_filter,
                key=f"{shapefile.geometry.key}_{country}_{regions}",
            ),
        )


class IsCountry(VariesByRegion):
    """Each region is a country, so lies within just itself."""

    def compute_by_region(self, shapefile):
        table = shapefile.load_file()
        return pd.Series(
            [(c,) if c in SOURCE_COUNTRIES else None for c in table.longname],
            index=table.index,
        )


class ContainedWithinCountries(VariesByRegion):
    """
    Each region lies within the source countries of the subnational regions it is related to (by
    anything but bordering, as on article pages), or None if any of those is not in one. Those
    relationships count an overlap above 5% of the region's land or population.
    """

    def compute_by_region(self, shapefile):
        # pylint: disable=import-outside-toplevel,cyclic-import
        # the subnational regions themselves use ContainedWithinCountries
        from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
            SUBNATIONAL_REGIONS,
        )

        subnational_countries = {
            row.longname: _subnational_source_countries(row)
            for row in SUBNATIONAL_REGIONS.load_file().itertuples()
        }

        related = related_subnationals(shapefile.names, SUBNATIONAL_REGIONS.names)
        table = shapefile.load_file()
        result = []
        for longname in table.longname:
            countries = [subnational_countries[s] for s in related.get(longname, ())]
            if not countries or None in countries:
                result.append(None)
            else:
                result.append(tuple(sorted({c for cs in countries for c in cs})))
        return pd.Series(result, index=table.index)


def _subnational_source_countries(subnational):
    """A subnational region's source countries, e.g. ("USA",) for California."""
    # pylint: disable=import-outside-toplevel,cyclic-import
    from urbanstats.geometry.shapefiles.shapefiles.subnational_regions import (
        extract_country_longname,
        valid_state,
    )

    country = extract_country_longname(subnational)
    if country == "USA" and valid_state(subnational.NAME):
        return ("USA",)
    if country in ("Canada", "Australia"):
        return (country,)
    # including the US territories other than Puerto Rico, which aren't in the census
    return None


@permacache(
    "urbanstats/geometry/shapefiles/source_countries/related_subnationals_3",
    key_function=dict(regions=stable_hash, subnational_regions=stable_hash),
)
def related_subnationals(regions, subnational_regions):
    """Longname -> the subnational regions it contains, is contained by, or intersects."""
    relationships = compute_relationships(
        regions.geometry, subnational_regions.geometry, subnational_regions.geometry
    )
    names = shapefile_longnames(regions)
    subnational_names = shapefile_longnames(subnational_regions)
    result = {}
    for kind in ["same_geography", "a_contains_b", "a_contained_by_b", "intersects"]:
        for i, j in relationships[kind]:
            result.setdefault(names[i], set()).add(subnational_names[j])
    return result
