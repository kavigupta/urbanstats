from urbanstats.data.election_data import aggregated_election_results, vest_elections
from urbanstats.games.quiz_question_metadata import ELECTION, QuizQuestionDescriptor
from urbanstats.statistics.statistic_collection import USAStatistics


class USElectionStatistics(USAStatistics):
    version = 4

    def name_for_each_statistic(self):
        return {
            **{(elect.name, "margin"): elect.name for elect in vest_elections},
            ("2016-2020 Swing", "margin"): "2016-2020 Swing",
            ("2020-2024 Swing", "margin"): "2020-2024 Swing",
        }

    def varname_for_each_statistic(self):
        return {
            **{
                (elect.name, "margin"): "pres_"
                + elect.name[:4].lower().replace(" ", "_")
                + "_margin"
                for elect in vest_elections
            },
            ("2016-2020 Swing", "margin"): "pres_swing_2016_2020",
            ("2020-2024 Swing", "margin"): "pres_swing_2020_2024",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("election")

    def quiz_question_descriptors(self):
        return QuizQuestionDescriptor.several(
            ELECTION,
            {
                (
                    "2020 Presidential Election",
                    "margin",
                ): "!FULL Which voted more for Biden in the 2020 presidential election?",
                (
                    "2016 Presidential Election",
                    "margin",
                ): "!FULL Which voted more for Clinton in the 2016 presidential election?",
                (
                    "2024 Presidential Election",
                    "margin",
                ): "!FULL Which voted more for Harris in the 2024 presidential election?",
                (
                    "2016-2020 Swing",
                    "margin",
                ): "!FULL Which swung towards Democrats more from 2016 to 2020?",
                (
                    "2020-2024 Swing",
                    "margin",
                ): "!FULL Which swung less towards Republicans from 2020 to 2024?",
            },
        )

    def compute_statistics_dictionary_usa(
        self, *, shapefile, existing_statistics, shapefile_table
    ):
        table = aggregated_election_results(shapefile)
        for elect_k in vest_elections:
            table[elect_k.name, "margin"] = (
                table[elect_k.name, "dem"] - table[elect_k.name, "gop"]
            ) / table[elect_k.name, "total"]

        table[("2016-2020 Swing", "margin")] = (
            table[("2020 Presidential Election", "margin")]
            - table[("2016 Presidential Election", "margin")]
        )
        table[("2020-2024 Swing", "margin")] = (
            table[("2024 Presidential Election", "margin")]
            - table[("2020 Presidential Election", "margin")]
        )

        table = table[[x for x in table.columns if x[1] == "margin"]]

        return {k: table[k] for k in table.columns}
