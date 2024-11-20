from urbanstats.data.elevation import elevation_statistics_for_shapefile
from urbanstats.data.gpw import compute_gpw_data_for_shapefile
from urbanstats.statistics.collections.census import DENSITY_EXPLANATION_PW
from urbanstats.statistics.extra_statistics import HistogramSpec
from urbanstats.statistics.statistic_collection import InternationalStatistics

POPULATION_WEIGHTED_EXPLANATION = (
    "Population weighted elevation/hilliness"
    " statistics are calculated by computing the statistic for"
    " each person in the region and then averaging the results."
)


class ElevationHillinessStatistics(InternationalStatistics):
    version = 4

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

    def compute_statistics_dictionary_intl(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        result = elevation_statistics_for_shapefile(shapefile)
        return {
            "gridded_hilliness": result["hilliness"],
            "gridded_elevation": result["elevation"],
        }
