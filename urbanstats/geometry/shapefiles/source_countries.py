from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Callable, Dict, Iterable, Optional, Tuple

import attr

# The countries whose statistics agencies are data sources
SOURCE_COUNTRIES = ("USA", "Canada")


def source_countries_from(countries: Iterable[str]) -> Optional[Tuple[str, ...]]:
    """The given countries, if they are all source countries, else None."""
    countries = tuple(sorted(set(countries)))
    if not countries or any(c not in SOURCE_COUNTRIES for c in countries):
        return None
    return countries


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
    def mask(self, table, country):
        """Whether each row of the raw table lies within exactly this country."""

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

    def mask(self, table, country):
        assert country == self.country
        return True

    def subset_shapefile(self, shapefile, country):
        assert country == self.country
        return shapefile


@dataclass(frozen=True)
class ByRow(SourceCountries):
    """
    Each region's source countries come from its row of the raw table. `names_in_country` is what
    the shapefile's type is called within each country, e.g. {"USA": "US Urban Center"}.
    """

    names_in_country: Dict[str, str]
    of_row: Callable[..., Optional[Tuple[str, ...]]] = field(compare=False)

    @property
    def countries(self):
        return tuple(self.names_in_country)

    def localized_type_names(self, parent_name):
        return {
            country: {parent_name: name}
            for country, name in self.names_in_country.items()
        }

    def mask(self, table, country):
        return table.apply(lambda row: self.of_row(row) == (country,), axis=1)

    def subset_shapefile(self, shapefile, country):
        def in_country(row):
            return shapefile.filter(row) and self.of_row(row) == (country,)

        return attr.evolve(
            shapefile, filter=in_country, hash_key=f"{shapefile.hash_key}_{country}"
        )
