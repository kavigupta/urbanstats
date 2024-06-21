from election_data import vest_elections
from urbanstats.statistics.statistic_collection import USElectionStatisticsCollection


class USElectionStatistics(USElectionStatisticsCollection):
    def name_for_each_statistic(self):
        return {
            **{(elect.name, "margin"): elect.name for elect in vest_elections},
            ("2016-2020 Swing", "margin"): "2016-2020 Swing",
        }

    def category_for_each_statistic(self):
        return self.same_for_each_name("election")

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

    def mutate_statistic_table(self, statistics_table, shapefile_table):
        # TODO this should be here not in the american_shapefile class
        pass
