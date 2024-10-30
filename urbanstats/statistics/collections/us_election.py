from urbanstats.data.election_data import aggregated_election_results, vest_elections
from urbanstats.statistics.statistic_collection import USAStatistics


class USElectionStatistics(USAStatistics):
    def name_for_each_statistic(self):
        return {
            **{(elect.name, "margin"): elect.name for elect in vest_elections},
            ("2016-2020 Swing", "margin"): "2016-2020 Swing",
        }

    def explanation_page_for_each_statistic(self):
        return self.same_for_each_name("election")

    def quiz_question_names(self):
        return {
            (
                "2020 Presidential Election",
                "margin",
            ): "!FULL Which voted more for Biden in the 2020 presidential election?",
            (
                "2016 Presidential Election",
                "margin",
            ): "!FULL Which voted more for Clinton in the 2016 presidential election?",
            (
                "2016-2020 Swing",
                "margin",
            ): "!FULL Which swung towards Democrats more from 2016 to 2020?",
        }

    def compute_statistics(self, shapefile, statistics_table, shapefile_table):
        table = aggregated_election_results(shapefile)
        for elect_k in vest_elections:
            table[elect_k.name, "margin"] = (
                table[elect_k.name, "dem"] - table[elect_k.name, "gop"]
            ) / table[elect_k.name, "total"]

        table[("2016-2020 Swing", "margin")] = (
            table[("2020 Presidential Election", "margin")]
            - table[("2016 Presidential Election", "margin")]
        )

        table = table[[x for x in table.columns if x[1] == "margin"]]

        for k in table.columns:
            statistics_table[k] = table[k]

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        raise NotImplementedError
