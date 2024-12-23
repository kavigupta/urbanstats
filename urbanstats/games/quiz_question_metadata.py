from dataclasses import dataclass


@dataclass(frozen=True)
class QuizQuestionCollection:
    name: str
    weight_entire_collection: float = 1.0


@dataclass(frozen=True)
class QuizQuestionDescriptor:
    name: str
    collection: QuizQuestionCollection

    @classmethod
    def several(cls, collection, key_to_name):
        return {key: cls(name, collection) for key, name in key_to_name.items()}


@dataclass(frozen=True)
class QuizQuestionSkip:
    @classmethod
    def several(cls, *keys):
        return {key: cls() for key in keys}


POPULATION = QuizQuestionCollection("Population", 2)
POPULATION_OR_DENSITY_CHANGE = QuizQuestionCollection("Population Change")
POPULATION_DENSITY = QuizQuestionCollection("Population Density", 2)
HEALTH_CDC = QuizQuestionCollection("Health CDC", 3)
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
INDUSTRY = QuizQuestionCollection("Industry")
OCCUPATION = QuizQuestionCollection("Occupation")
HEALTH_INSURANCE = QuizQuestionCollection("Health Insurance")
INTERNET = QuizQuestionCollection("Internet")
NATIONAL_ORIGIN = QuizQuestionCollection("National Origin")
LANGUAGE = QuizQuestionCollection("Language")
SEGREGATION = QuizQuestionCollection("Segregation")
SORS = QuizQuestionCollection("Sexual Orientation and Relationship Status")
TRAFFIC_ACCIDENTS = QuizQuestionCollection("Traffic Accidents")
COMMUTE_TIME = QuizQuestionCollection("Commute Time")
COMMUTE_MODE = QuizQuestionCollection("Commute Mode")
VEHICLE_OWNERSHIP = QuizQuestionCollection("Vehicle Ownership")
ELECTION = QuizQuestionCollection("Election")
WEATHER = QuizQuestionCollection("Weather")
