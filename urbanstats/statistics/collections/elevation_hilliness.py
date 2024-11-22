import numpy as np

from urbanstats.data.elevation import (
    elevation_statistics_for_american_shapefile,
    elevation_statistics_for_shapefile,
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
    version = 5

    def name_for_each_statistic(self):
        return {
            "gridded_hilliness": "PW Mean Hilliness (Grade)",
            "gridded_elevation": "PW Mean Elevation",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("elevation_hilliness")

    def quiz_question_names(self):
        return {
            "gridded_elevation": "higher population-weighted mean elevation!TOOLTIP"
            + POPULATION_WEIGHTED_EXPLANATION,
        }

    def quiz_question_unused(self):
        # apparently this is "too confusing" and "a weird metric"
        # I think they're just coping
        return ["gridded_hilliness"]

    def dependencies(self):
        return []

    def compute_statistics_dictionary(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        just_usa, usa_stats = compute_subset_statistics(
            shapefile,
            existing_statistics,
            shapefile_table,
            subset="USA",
            compute_function=self.compute_usa,
        )
        if just_usa:
            return usa_stats

        intl_stats = self.compute_intl(shapefile)
        if not usa_stats:
            return intl_stats

        assert intl_stats.keys() == usa_stats.keys()

        intl_stats = {k: np.array(v) for k, v in intl_stats.items()}

        for k, v in usa_stats.items():
            intl_stats[k][~np.isnan(v)] = v[~np.isnan(v)]

        return intl_stats

    def compute_intl(self, shapefile):
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
