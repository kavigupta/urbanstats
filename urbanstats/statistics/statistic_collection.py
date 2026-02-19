from abc import ABC, abstractmethod

import numpy as np
import pandas as pd

from urbanstats.acs.load import (
    ACSDataEntityForMultipleLevels,
    aggregated_acs_data,
    aggregated_acs_data_us_pr,
)
from urbanstats.geometry.shapefiles.shapefile import (
    EmptyShapefileError,
    subset_mask_key,
)


class StatisticCollection(ABC):
    def __init__(self):
        quiz_questions = set(self.quiz_question_descriptors())
        all_columns = set(self.internal_statistic_names_list())
        extra_quiz_questions = quiz_questions - all_columns
        assert not extra_quiz_questions, f"Extra quiz questions: {extra_quiz_questions}"
        missing_quiz_questions = all_columns - quiz_questions
        assert (
            not missing_quiz_questions
        ), f"Missing quiz questions: {missing_quiz_questions}"

    def internal_statistic_names_list(self):
        return list(self.name_for_each_statistic())

    def legacy_statistic_names(self):
        return {}

    def deprecation_for_each_statistic(self):
        """Returns a dictionary mapping statistic keys to deprecation messages (None if not deprecated)."""
        return {name: None for name in self.internal_statistic_names_list()}

    @abstractmethod
    def name_for_each_statistic(self):
        pass

    @abstractmethod
    def varname_for_each_statistic(self):
        """Returns a dictionary mapping statistic keys to program-friendly variable names."""

    @abstractmethod
    def explanation_page_for_each_statistic(self):
        pass

    @abstractmethod
    def quiz_question_descriptors(self):
        pass

    def dependencies(self):
        return ()

    @abstractmethod
    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        """
        Returns a dictionary of statistics to add to the existing statistics table.

        :param shapefile: The shapefile to compute statistics for.
        :param existing_statistics: A dictionary containing relevant existing statistics.
        :param shapefile_table: The full shapefile table.

        :return: A dictionary of statistics to add to the existing statistics table.
        """

    def same_for_each_name(self, value):
        return {name: value for name in self.internal_statistic_names_list()}

    def extra_stats(self):
        return {}

    def __permacache_hash__(self):
        return (self.__class__.__name__, getattr(self, "version", None))


class GeographicStatistics(StatisticCollection):
    pass


class InternationalStatistics(StatisticCollection):
    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        if "international_gridded_data" in shapefile.special_data_sources:
            return self.compute_statistics_dictionary_intl(
                shapefile=shapefile,
                existing_statistics=existing_statistics,
                shapefile_table=shapefile_table,
            )
        return {}

    @abstractmethod
    def compute_statistics_dictionary_intl(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        pass


class USAStatistics(StatisticCollection):
    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        _, result = compute_subset_statistics(
            shapefile,
            existing_statistics,
            shapefile_table,
            subset="USA",
            compute_function=self.compute_statistics_dictionary_usa,
        )
        return result

    @abstractmethod
    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        pass


class USAStatisticsCounties(USAStatistics):
    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        if "composed_of_counties" not in shapefile.special_data_sources:
            return {}
        return super().compute_statistics_dictionary(
            shapefile=shapefile,
            existing_statistics=existing_statistics,
            shapefile_table=shapefile_table,
        )


class CanadaStatistics(StatisticCollection):
    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        _, result = compute_subset_statistics(
            shapefile,
            existing_statistics,
            shapefile_table,
            subset="Canada",
            compute_function=self.compute_statistics_dictionary_canada,
        )
        return result

    @abstractmethod
    def compute_statistics_dictionary_canada(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        pass


def compute_subset_statistics(
    shapefile, existing_statistics, shapefile_table, *, subset, compute_function
):
    if subset not in shapefile.subset_masks:
        return False, {}

    shapefile_subset = shapefile.subset_shapefile(subset)
    if shapefile_subset is shapefile:
        return True, compute_function(
            shapefile=shapefile,
            existing_statistics=existing_statistics,
            shapefile_table=shapefile_table,
        )
    try:
        shapefile_subset.load_file()
    except EmptyShapefileError:
        return False, {}
    mask = shapefile_table[subset_mask_key(subset)]
    [idxs] = np.where(mask)
    for_subset = compute_function(
        shapefile=shapefile_subset,
        existing_statistics={
            k: existing_statistics[k][mask] for k in existing_statistics
        },
        shapefile_table=shapefile_table[mask],
    )

    full = {}
    for k in for_subset:
        result = [np.nan] * len(shapefile_table)
        for idx, value in zip(idxs, for_subset[k]):
            result[idx] = value
        full[k] = pd.Series(result, index=shapefile_table.index)
    return False, full


class ACSStatisticsColection(USAStatistics):
    def year(self):
        return 2020

    @abstractmethod
    def acs_name(self):
        pass

    @abstractmethod
    def acs_entity(self):
        pass

    def acs_entity_dict(self):
        return {self.acs_name(): self.acs_entity()}

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        result = {}
        for entity in self.acs_entity_dict().values():
            acs_data = aggregated_acs_data(self.year(), entity, shapefile)
            for column in acs_data.columns:
                result[column] = acs_data[column]
        result = pd.DataFrame(result)
        self.mutate_acs_results(result)
        return {name: result[name] for name in self.internal_statistic_names_list()}

    @abstractmethod
    def mutate_acs_results(self, statistics_table):
        pass


class ACSUSPRStatisticsColection(USAStatistics):
    def year(self):
        return 2020

    @abstractmethod
    def acs_name(self):
        pass

    @abstractmethod
    def acs_entities(self):
        pass

    def acs_entity_dict(self):
        return {self.acs_name(): self.acs_entities()}

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        result = {}
        for entities in self.acs_entity_dict().values():
            entity_us, entity_pr = entities
            acs_data = aggregated_acs_data_us_pr(
                self.year(), entity_us, entity_pr, shapefile
            )
            for column in acs_data.columns:
                result[column] = acs_data[column]
        result = pd.DataFrame(result)
        self.mutate_acs_results(result)
        return {name: result[name] for name in self.internal_statistic_names_list()}

    @abstractmethod
    def mutate_acs_results(self, statistics_table):
        pass


class GeoIDStatisticsCollection(USAStatistics):
    def year(self):
        return 2020

    @abstractmethod
    def compute_statistics_dictionary_for_census_level(
        self, census_level, shapefile, existing_statistics, shapefile_table
    ):
        pass

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        census_levels = shapefile.census_levels
        if not census_levels:
            return {}
        [census_level] = census_levels
        return self.compute_statistics_dictionary_for_census_level(
            census_level, shapefile, existing_statistics, shapefile_table
        )


class GeoIDStatisticsACS(GeoIDStatisticsCollection):
    @abstractmethod
    def acs_data_entity_multi(self) -> ACSDataEntityForMultipleLevels:
        pass

    @abstractmethod
    def allow_missing_geoid(self, census_level, geoid, name, population):
        return False

    def dependencies(self):
        return ["population"]

    def compute_statistics_dictionary_for_census_level(
        self, census_level, shapefile, existing_statistics, shapefile_table
    ):
        population = existing_statistics["population"]
        assert len(population) == len(shapefile_table)
        geoid_to_population = dict(zip(shapefile_table["geoid"], population))
        geoid_to_name = dict(zip(shapefile_table["geoid"], shapefile_table["longname"]))
        entity = self.acs_data_entity_multi()
        table = entity.query(census_level)
        assert set(table) == set(self.internal_statistic_names_list())
        geoid_table = set(shapefile_table["geoid"])
        geoid_acs = set(table.index)
        if geoid_table != geoid_acs:
            missing_in_acs = {
                x
                for x in geoid_table - geoid_acs
                if not self.allow_missing_geoid(
                    census_level, x, geoid_to_name[x], geoid_to_population[x]
                )
            }
            if missing_in_acs:
                print(
                    f"Missing in ACS: {sorted([geoid_to_name[x] for x in missing_in_acs])}"
                )
            assert not missing_in_acs

        array_result = np.full((len(shapefile_table), len(table.columns)), np.nan)
        mask = shapefile_table["geoid"].isin(table.index)
        array_result[mask] = table.loc[shapefile_table.loc[mask, "geoid"], :].to_numpy()
        return {name: array_result[:, i] for i, name in enumerate(table.columns)}
