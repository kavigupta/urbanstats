from urbanstats.geometry.segregation import compute_homogenity_statistics
from urbanstats.statistics.statistic_collection import (
    CensusStatisticsColection,
)

homogeneity_explanation = (
    "!TOOLTIP We define racial homogeneity as the average probability a person selecing "
    "a random person in a 250m radius will select someone of the same race"
)


class SegregationStatistics(CensusStatisticsColection):
    version = 3

    base_stats = {
        "homogeneity_250": "Racial Homogenity",
        "segregation_250": "Segregation",
        "segregation_250_10": "Mean Local Segregation",
    }

    def name_for_each_statistic(self):
        result = {}
        for k, v in self.base_stats.items():
            for year in 2000, 2010:
                result[f"{k}_{year}"] = f"{v} ({year})"
                result[f"{k}_diff_{year}"] = f"{v} Change ({year}-2020)"
            for year in (2020,):
                result[f"{k}_{year}"] = f"{v}"
        return result

    def category_for_each_statistic(self):
        def category(k):
            if "2000" in k:
                return "2000"
            if "2010" in k:
                return "2010"
            return "race"

        return {k: category(k) for k in self.name_for_each_statistic()}

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("segregation")

    def quiz_question_names(self):
        return {
            "homogeneity_250_2020": "higher racial homogeneity"
            + homogeneity_explanation,
            "homogeneity_250_diff_2010": "increase in racial homogeneity from 2010 to 2020"
            + homogeneity_explanation,
            "homogeneity_250_diff_2000": "increase in racial homogeneity from 2000 to 2020"
            + homogeneity_explanation,
        }

    def quiz_question_unused(self):
        return [
            x
            for x in self.name_for_each_statistic()
            if
            # too hard to explain succinctly in a tooltip
            not x.startswith("homogeneity")
            # non-dleta, redundant with 2020 ish
            or "diff" not in x and "2020" not in x
        ]

    def compute_stats_for_year(self, year, shapefile):
        homogeneity, segregation, segregation_10 = compute_homogenity_statistics(
            year, radius_small=0.25, radius_large=10, shapefile=shapefile
        )
        return dict(
            year=year,
            homogeneity_250=homogeneity,
            segregation_250=segregation,
            segregation_250_10=segregation_10,
        )

    def add_stats(self, table, stats, stats_current):
        for k in stats:
            if not k.startswith("year"):
                table[f"{k}_{stats['year']}"] = stats[k]

        if stats_current is not None:
            for k in stats:
                if not k.startswith("year"):
                    table[f"{k}_diff_{stats['year']}"] = stats_current[k] - stats[k]

    def compute_statistics(self, shapefile, statistics_table, shapefile_table):
        stats_2020 = self.compute_stats_for_year(2020, shapefile)
        stats_2010 = self.compute_stats_for_year(2010, shapefile)
        stats_2000 = self.compute_stats_for_year(2000, shapefile)

        self.add_stats(statistics_table, stats_2020, None)
        self.add_stats(statistics_table, stats_2010, stats_2020)
        self.add_stats(statistics_table, stats_2000, stats_2020)

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        raise NotImplementedError
