import numpy as np

from urbanstats.games.quiz_question_metadata import (
    HEALTH_CDC,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.geometry.historical_counties.aggregation import aggregate_to_suos
from urbanstats.statistics.statistic_collection import USAStatisticsCounties
from urbanstats.data.life_expectancy import imhe_2019


class IMHELifeExpectancyStatistics(USAStatisticsCounties):
    version = 9

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        population = np.array(existing_statistics["population"])
        agg, doi = aggregate_to_suos(shapefile, imhe_2019)
        agg = agg.copy()
        agg[doi > 0.001] = np.nan
        res = agg / (population[:, None] + 1e-9)
        assert len(imhe_2019.data_columns) == res.shape[1]
        res = dict(zip(imhe_2019.data_columns, res.T))
        return {
            "life_expectancy_2019": res["life_expectancy_to_agg"],
            "performance_score_adj_2019": res["performance_score_adj_to_agg"],
        }

    def name_for_each_statistic(self):
        return {
            "life_expectancy_2019": "Life Expectancy (2019)",
            "performance_score_adj_2019": "IMHE Health Performance Score (2019)",
        }

    def dependencies(self):
        return ["population"]

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("imhe")

    def quiz_question_descriptors(self):
        return {
            "life_expectancy_2019": QuizQuestionDescriptor(
                "life expectancy", HEALTH_CDC
            ),
            "performance_score_adj_2019": QuizQuestionSkip(),
        }

    def varname_for_each_statistic(self):
        return {
            "life_expectancy_2019": "life_expectancy_2019",
            "performance_score_adj_2019": "performance_score_adj_2019",
        }
