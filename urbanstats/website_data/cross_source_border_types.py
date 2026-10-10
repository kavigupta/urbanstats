from typing import Any, Dict, List, Optional

from urbanstats.geometry.shapefiles.shapefiles_list import shapefiles
from urbanstats.geometry.shapefiles.source_countries import ByRow, InCountry
from urbanstats.statistics.collections_list import statistic_collections
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names
from urbanstats.universe.universe_list import all_universes


def data_source_countries() -> List[str]:
    """
    The countries whose statistics agencies are data sources, i.e. the countries a
    shapefile can be subsetted to.
    """
    return sorted(
        {
            name
            for shapefile in shapefiles.values()
            for name in shapefile.source_country_list
        }
    )


def universe_data_source_country() -> Dict[str, str]:
    """
    For each universe lying wholly within one such country, pick that country. Otherwise don't include it.
    """
    countries = data_source_countries()
    assert set(countries) <= set(all_universes()), countries
    return {
        universe: country
        for universe in all_universes()
        for country in countries
        if universe == country or universe.endswith(f", {country}")
    }


def statistic_data_source_country() -> List[Optional[str]]:
    """
    The country whose statistics agency each statistic's data comes from.
    """
    collection_by_statistic = {
        statistic: collection
        for collection in statistic_collections
        for statistic in collection.name_for_each_statistic()
    }
    return [
        collection_by_statistic[statistic].data_source_country
        for statistic in internal_statistic_names()
    ]


def geography_data_source_country() -> Dict[str, str]:
    """
    Region type to the country that contains it, if any. Region types
    that are cross-national like Urban Centers are not included.
    """
    countries = set(data_source_countries())
    result = {}
    for shapefile in shapefiles.values():
        if isinstance(shapefile.source_countries, InCountry):
            country = shapefile.source_countries.country
            assert country in countries, country
            result[shapefile.meta["type"]] = country
    return result


def cross_source_border_types() -> Dict[str, Dict[str, Any]]:
    _check_declarations_match_source_countries()
    result = {
        shapefile.meta["type"]: {
            "alternativeGeographyTypes": list(
                shapefile.cross_source_borders.alternative_geography_types
            ),
            "reasonForNoAlternatives": (
                shapefile.cross_source_borders.reason_for_no_alternatives
            ),
        }
        for shapefile in shapefiles.values()
        if _can_straddle(shapefile)
    }
    _check_alternatives_never_straddle_a_border(result)
    return result


def _can_straddle(shapefile) -> bool:
    return (
        shapefile.cross_source_borders is not None
        and shapefile.cross_source_borders.can_straddle
    )


def _has_source_countries_by_row(shapefile) -> bool:
    return isinstance(shapefile.source_countries, ByRow)


def _check_declarations_match_source_countries() -> None:
    """
    A region can only go missing from a statistic if its source countries vary by region:
    where every region is in one country (InCountry), nothing is dropped.
    """
    for shapefile in shapefiles.values():
        typ = shapefile.meta["type"]
        declared = shapefile.cross_source_borders is not None
        if _has_source_countries_by_row(shapefile):
            assert declared, (
                f"{typ} computes single-country statistics on a filtered subset of itself,"
                f" so it must set cross_source_borders to say whether that can leave one of"
                f" its regions straddling a data source border"
            )
        else:
            assert not declared, (
                f"{typ} sets cross_source_borders, but all of its regions are in one country,"
                f" so no region of this type can go missing"
            )


def _check_alternatives_never_straddle_a_border(
    result: Dict[str, Dict[str, Any]]
) -> None:
    """
    Offering a region type with the same problem would be pointless, and offering one that
    doesn't exist would produce a dead link.
    """
    shapefile_by_type = {
        shapefile.meta["type"]: shapefile for shapefile in shapefiles.values()
    }
    for typ, info in result.items():
        for alternative in info["alternativeGeographyTypes"]:
            assert (
                alternative in shapefile_by_type
            ), f"{typ}'s alternative {alternative!r} is not a region type"
            assert not _can_straddle(
                shapefile_by_type[alternative]
            ), f"{typ}'s alternative {alternative!r} straddles data source borders itself"
