import numpy as np

from urbanstats.data.elevation import (
    elevation_statistics_for_american_shapefile,
    elevation_statistics_for_canada_shapefile,
    elevation_statistics_for_shapefile,
)
from urbanstats.games.quiz_question_metadata import (
    ELEVATION,
    QuizQuestionDescriptor,
    QuizQuestionSkip,
)
from urbanstats.statistics.statistic_collection import (
    GeographicStatistics,
    compute_subset_statistics,
)

POPULATION_WEIGHTED_EXPLANATION = (
    "Population weighted elevation/hilliness"
    " statistics are calculated by computing the statistic for"
    " each person in the region and then averaging the results."
)


class ElevationHillinessStatistics(GeographicStatistics):
    version = 8

    def name_for_each_statistic(self):
        return {
            "gridded_hilliness": "PW Mean Hilliness (Grade)",
            "gridded_elevation": "PW Mean Elevation",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("elevation_hilliness")

    def quiz_question_descriptors(self):
        return {
            "gridded_elevation": QuizQuestionDescriptor(
                "higher population-weighted mean elevation !TOOLTIP "
                + POPULATION_WEIGHTED_EXPLANATION,
                ELEVATION,
            ),
            "gridded_hilliness": QuizQuestionSkip(),
        }

    def dependencies(self):
        return []

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        subsets = []
        for subset_name, subset_fn in [
            ("USA", self.compute_usa),
            ("Canada", self.compute_canada),
        ]:
            just_subset, subset_stats = compute_subset_statistics(
                shapefile,
                existing_statistics,
                shapefile_table,
                subset=subset_name,
                compute_function=subset_fn,
            )
            if just_subset:
                return subset_stats
            if subset_stats:
                subsets.append(subset_stats)

        intl_stats = self.compute_intl(shapefile)
        if not subsets:
            return intl_stats

        for subset_stats in subsets:
            assert set(subset_stats.keys()) == set(intl_stats.keys())

        intl_stats = {k: np.array(v) for k, v in intl_stats.items()}

        for subset_stats in subsets:
            for k, v in subset_stats.items():
                intl_stats[k][~np.isnan(v)] = v[~np.isnan(v)]

        return intl_stats

    def compute_intl(self, shapefile):
        if "international_gridded_data" not in shapefile.special_data_sources:
            return {}
        result = elevation_statistics_for_shapefile(shapefile)
        return {
            "gridded_hilliness": result["hilliness"],
            "gridded_elevation": result["elevation"],
        }

    def compute_usa(self, *, shapefile, existing_statistics, shapefile_table):
        del existing_statistics, shapefile_table
        table = elevation_statistics_for_american_shapefile(shapefile)
        return {
            "gridded_hilliness": table["hilliness"],
            "gridded_elevation": table["elevation"],
        }

    def compute_canada(self, *, shapefile, existing_statistics, shapefile_table):
        del existing_statistics, shapefile_table
        table = elevation_statistics_for_canada_shapefile(shapefile)
        return {
            "gridded_hilliness": table["hilliness"],
            "gridded_elevation": table["elevation"],
        }
