import numpy as np
from urbanstats.games.quiz_question_metadata import ELECTION, QuizQuestionDescriptor
from urbanstats.geometry.historical_counties.aggregation import aggregate_to_suos
from urbanstats.statistics.statistic_collection import USAStatisticsCounties

from urbanstats.data.election_data_by_county.tonmcg import tonmcg_elections


class USCountyLevelElectionsStatistics(USAStatisticsCounties):
    version = 9

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        results = {}
        for election_name, suo_data_source in tonmcg_elections.items():
            agg, doi = aggregate_to_suos(shapefile, suo_data_source)
            agg = agg.copy()
            agg[doi > 0.001] = np.nan
            margin = (agg[:, 0] - agg[:, 1]) / (agg[:, 2] + 1e-9)
            results[(election_name, "margin")] = margin
        results[("2008-2012 Swing", "margin")] = (
            results[("2012 Presidential Election", "margin")]
            - results[("2008 Presidential Election", "margin")]
        )
        results[("2012-2016 Swing", "margin")] = (
            existing_statistics[("2016 Presidential Election", "margin")]
            - results[("2012 Presidential Election", "margin")]
        )
        results[("2020-2024 Swing", "margin")] = (
            results[("2024 Presidential Election", "margin")]
            - existing_statistics[("2020 Presidential Election", "margin")]
        )
        return results

    def name_for_each_statistic(self):
        return {
            **{(elect, "margin"): elect for elect in tonmcg_elections},
            ("2008-2012 Swing", "margin"): "2008-2012 Swing",
            ("2012-2016 Swing", "margin"): "2012-2016 Swing",
            ("2020-2024 Swing", "margin"): "2020-2024 Swing",
        }

    def dependencies(self):
        return [
            ("2016 Presidential Election", "margin"),
            ("2020 Presidential Election", "margin"),
        ]

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("county-elections")

    def quiz_question_descriptors(self):
        return QuizQuestionDescriptor.several(
            ELECTION,
            {
                (
                    "2008 Presidential Election",
                    "margin",
                ): "!FULL Which voted more for Obama in the 2008 presidential election?",
                (
                    "2012 Presidential Election",
                    "margin",
                ): "!FULL Which voted more for Obama in the 2012 presidential election?",
                (
                    "2024 Presidential Election",
                    "margin",
                ): "!FULL Which voted more for Harris in the 2024 presidential election?",
                (
                    "2008-2012 Swing",
                    "margin",
                ): "!FULL Which swung less towards Republicans from 2008 to 2012?",
                (
                    "2012-2016 Swing",
                    "margin",
                ): "!FULL Which swung less towards Republicans from 2012 to 2016?",
                (
                    "2020-2024 Swing",
                    "margin",
                ): "!FULL Which swung less towards Republicans from 2020 to 2024?",
            },
        )

    def varname_for_each_statistic(self):
        return {
            **{
                (elect, "margin"): "pres_"
                + elect[:4].lower().replace(" ", "_")
                + "_margin"
                for elect in tonmcg_elections
            },
            ("2008-2012 Swing", "margin"): "pres_swing_2008_2012",
            ("2012-2016 Swing", "margin"): "pres_swing_2012_2016",
            ("2020-2024 Swing", "margin"): "pres_swing_2020_2024",
        }
