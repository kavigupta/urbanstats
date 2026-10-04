from abc import abstractmethod

from urbanstats.statistics.statistic_collection import StatisticCollection
from urbanstats.statistics.utils import fractionalize


class SameAsUS(StatisticCollection):
    """
    Statistics that are those of a US collection, computed from another country's census.

    Each is named after the US statistic with `name_suffix` appended, and displayed with `source_tag`.
    """

    name_suffix: str
    source_tag: str

    @abstractmethod
    def us_equivalent(self):
        pass

    def remap_name(self, us_internal_name):
        return f"{us_internal_name}_{self.name_suffix}"

    def us_equivalent_fields(self):
        return list(self.us_equivalent().internal_statistic_names_list())

    def name_for_each_statistic(self):
        return {
            self.remap_name(k): f"{v} [{self.source_tag}]"
            for k, v in self.us_equivalent().name_for_each_statistic().items()
            if k in self.us_equivalent_fields()
        }

    def unit_for_each_statistic(self):
        return {
            self.remap_name(k): v
            for k, v in self.us_equivalent().unit_for_each_statistic().items()
            if k in self.us_equivalent_fields()
        }

    def varname_for_each_statistic(self):
        return {
            self.remap_name(k): v
            for k, v in self.us_equivalent().varname_for_each_statistic().items()
            if k in self.us_equivalent_fields()
        }

    def quiz_question_descriptors(self):
        return {
            self.remap_name(k): self.us_equivalent().quiz_question_descriptors()[k]
            for k in self.us_equivalent_fields()
        }

    def post_process(self, statistic_table):
        fractionalize(statistic_table, *self.internal_statistic_names_list())
        return statistic_table
