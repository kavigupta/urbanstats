from dataclasses import dataclass


@dataclass
class QuizQuestionCollection:
    name: str


@dataclass
class QuizQuestionDescriptor:
    name: str
    collection: QuizQuestionCollection

    @classmethod
    def several(cls, collection, key_to_name):
        return {key: cls(name, collection) for key, name in key_to_name.items()}


@dataclass
class QuizQuestionSkip:
    @classmethod
    def several(cls, *keys):
        return {key: cls() for key in keys}


POPULATION = QuizQuestionCollection("Population")
POPULATION_OR_DENSITY_CHANGE = QuizQuestionCollection("Population Change")
POPULATION_DENSITY = QuizQuestionCollection("Population Density")
HEALTH_CDC = QuizQuestionCollection("Health CDC")
INCOME = QuizQuestionCollection("Income")
POVERTY = QuizQuestionCollection("Poverty")
EDUCATION_LEVEL = QuizQuestionCollection("Education Level")
EDUCATION_FIELD = QuizQuestionCollection("Education Field")
RACE = QuizQuestionCollection("Race")
HOUSING = QuizQuestionCollection("Housing")
ELEVATION = QuizQuestionCollection("Elevation")
FEATURE_DIST = QuizQuestionCollection("Feature Distance")
GENERATION = QuizQuestionCollection("Generation")
HEATING = QuizQuestionCollection("Heating")
RENT = QuizQuestionCollection("Rent")
RENT_BURDEN = QuizQuestionCollection("Rent Burden")
HOUSING_YEAR = QuizQuestionCollection("Housing Year")
MARRIAGE = QuizQuestionCollection("Marriage")
