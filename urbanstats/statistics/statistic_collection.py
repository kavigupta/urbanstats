from abc import ABC, abstractmethod

import pandas as pd

from urbanstats.acs.load import aggregated_acs_data, aggregated_acs_data_us_pr
from urbanstats.games.quiz_region_types import (
    QUIZ_REGION_TYPES_ALL,
    QUIZ_REGION_TYPES_INTERNATIONAL,
    QUIZ_REGION_TYPES_USA,
)

ORDER_CATEGORY_MAIN = 0
ORDER_CATEGORY_OTHER_DENSITIES = 1


class StatisticCollection(ABC):
    def __init__(self):
        quiz_overlaps = set(self.quiz_question_unused()) & set(
            self.quiz_question_names()
        )
        assert (
            not quiz_overlaps
        ), f"Quiz questions both used and unused: {quiz_overlaps}"
        quiz_questions = set(self.quiz_question_names()) | set(
            self.quiz_question_unused()
        )
        all_columns = set(self.name_for_each_statistic())
        extra_quiz_questions = quiz_questions - all_columns
        assert not extra_quiz_questions, f"Extra quiz questions: {extra_quiz_questions}"
        missing_quiz_questions = all_columns - quiz_questions
        assert (
            not missing_quiz_questions
        ), f"Missing quiz questions: {missing_quiz_questions}"

    @abstractmethod
    def name_for_each_statistic(self):
        pass

    @abstractmethod
    def explanation_page_for_each_statistic(self):
        pass

    @abstractmethod
    def quiz_question_names(self):
        pass

    @abstractmethod
    def quiz_question_types(self):
        pass

    def quiz_question_unused(self):
        return ()

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

    @abstractmethod
    def for_america(self):
        pass

    @abstractmethod
    def for_international(self):
        pass

    def same_for_each_name(self, value):
        return {name: value for name in self.name_for_each_statistic()}

    def extra_stats(self):
        return {}

    def __permacache_hash__(self):
        return (self.__class__.__name__, getattr(self, "version", None))


class GeographicStatistics(StatisticCollection):
    def for_america(self):
        return True

    def for_international(self):
        return True

    def quiz_question_types(self):
        return QUIZ_REGION_TYPES_ALL


class InternationalStatistics(StatisticCollection):
    def for_america(self):
        return False

    def for_international(self):
        return True

    def quiz_question_types(self):
        return QUIZ_REGION_TYPES_INTERNATIONAL

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        if shapefile.include_in_gpw:
            return self.compute_statistics_dictionary_intl(
                shapefile=shapefile,
                existing_statistics=existing_statistics,
                shapefile_table=shapefile_table,
            )
        return {}

    @abstractmethod
    def compute_statistics_dictionary_intl(
        self, shapefile, existing_statistics, shapefile_table
    ):
        pass


class USAStatistics(StatisticCollection):
    def for_america(self):
        return True

    def for_international(self):
        return False

    def quiz_question_types(self):
        return QUIZ_REGION_TYPES_USA

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        if shapefile.american:
            return self.compute_statistics_dictionary_usa(
                shapefile=shapefile,
                existing_statistics=existing_statistics,
                shapefile_table=shapefile_table,
            )
        return {}

    @abstractmethod
    def compute_statistics_dictionary_usa(
        self, shapefile, existing_statistics, shapefile_table
    ):
        pass


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
        return {name: result[name] for name in self.name_for_each_statistic()}

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
        return {name: result[name] for name in self.name_for_each_statistic()}

    @abstractmethod
    def mutate_acs_results(self, statistics_table):
        pass
