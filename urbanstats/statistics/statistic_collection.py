from abc import ABC, abstractmethod


class StatisticCollection(ABC):
    def __init__(self):
        quiz_overlaps = set(self.quiz_question_unused()) & set(
            self.quiz_question_names()
        )
        assert (
            not quiz_overlaps
        ), f"Quiz questions both used and unused: {quiz_overlaps}"
        quiz_questions = set(self.quiz_question_names()) | set(
            self.quiz_question_unused()
        )
        all_columns = set(self.name_for_each_statistic())
        extra_quiz_questions = quiz_questions - all_columns
        assert not extra_quiz_questions, f"Extra quiz questions: {extra_quiz_questions}"
        missing_quiz_questions = all_columns - quiz_questions
        assert (
            not missing_quiz_questions
        ), f"Missing quiz questions: {missing_quiz_questions}"

    @abstractmethod
    def name_for_each_statistic(self):
        pass

    @abstractmethod
    def quiz_question_names(self):
        pass

    def quiz_question_unused(self):
        return ()

    @abstractmethod
    def mutate_shapefile_table(self, shapefile_table):
        pass


class ACSStatisticsColection(StatisticCollection):
    @abstractmethod
    def acs_name(self):
        pass

    @abstractmethod
    def acs_entity(self):
        pass

    def acs_entity_dict(self):
        return {self.acs_name(): self.acs_entity()}
