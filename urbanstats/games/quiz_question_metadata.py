from dataclasses import dataclass


@dataclass(frozen=True)
class QuizQuestionCollection:
    name: str
    weight_entire_collection: float = 1.0
    difficulty_multiplier: float = 1.0


@dataclass(frozen=True)
class QuizQuestionDescriptor:
    name: str
    collection: QuizQuestionCollection
    difficulty_multiplier_val: float | None = None

    @classmethod
    def several(
        cls,
        collection: QuizQuestionCollection,
        key_to_name: dict[str, str],
        difficulty_multipliers: dict[str, float] | None = None,
    ) -> dict[str, "QuizQuestionDescriptor"]:
        if difficulty_multipliers is None:
            difficulty_multipliers = {}
        return {
            key: cls(name, collection, difficulty_multipliers.get(key, None))
            for key, name in key_to_name.items()
        }

    def difficulty_multiplier(self) -> float:
        return (
            self.difficulty_multiplier_val
            if self.difficulty_multiplier_val is not None
            else self.collection.difficulty_multiplier
        )


@dataclass(frozen=True)
class QuizQuestionSkip:
    @classmethod
    def several(cls, *keys: str) -> dict[str, "QuizQuestionSkip"]:
        return {key: cls() for key in keys}


POPULATION = QuizQuestionCollection("Population", 2, difficulty_multiplier=0.25)
POPULATION_OR_DENSITY_CHANGE = QuizQuestionCollection(
    "Population Change", difficulty_multiplier=1.5
)
POPULATION_DENSITY = QuizQuestionCollection(
    "Population Density", 2, difficulty_multiplier=0.25
)
HEALTH_CDC = QuizQuestionCollection("Health CDC", difficulty_multiplier=1.5)
HEALTH_IHME = QuizQuestionCollection(
    "Health IHME", difficulty_multiplier=1.5, weight_entire_collection=2
)
INCOME = QuizQuestionCollection("Income", difficulty_multiplier=0.6)
INCOME_MEDIAN = QuizQuestionCollection("Income Median", difficulty_multiplier=0.6)
POVERTY = QuizQuestionCollection("Poverty", difficulty_multiplier=0.6)
EDUCATION_LEVEL = QuizQuestionCollection("Education Level", difficulty_multiplier=0.5)
EDUCATION_FIELD = QuizQuestionCollection("Education Field", difficulty_multiplier=0.5)
RACE = QuizQuestionCollection("Race", difficulty_multiplier=0.75)
HOUSING = QuizQuestionCollection("Housing", difficulty_multiplier=1.5)
ELEVATION = QuizQuestionCollection("Elevation")
FEATURE_DIST = QuizQuestionCollection("Feature Distance", difficulty_multiplier=1.5)
GENERATION = QuizQuestionCollection("Generation", 0.5, difficulty_multiplier=2)
HEATING = QuizQuestionCollection("Heating", 0.5, difficulty_multiplier=1.5)
RENT = QuizQuestionCollection("Rent", difficulty_multiplier=1.5)
RENT_BURDEN = QuizQuestionCollection("Rent Burden", difficulty_multiplier=1.5)
HOUSING_YEAR = QuizQuestionCollection("Housing Year", difficulty_multiplier=1.5)
MARRIAGE = QuizQuestionCollection("Marriage", difficulty_multiplier=0.5)
INDUSTRY = QuizQuestionCollection("Industry", 0.25, difficulty_multiplier=2)
OCCUPATION = QuizQuestionCollection("Occupation", 0.25, difficulty_multiplier=2)
HEALTH_INSURANCE = QuizQuestionCollection("Health Insurance", difficulty_multiplier=2)
INTERNET = QuizQuestionCollection("Internet", difficulty_multiplier=2)
NATIONAL_ORIGIN = QuizQuestionCollection("National Origin", difficulty_multiplier=1.5)
LANGUAGE = QuizQuestionCollection("Language", difficulty_multiplier=1.5)
SEGREGATION = QuizQuestionCollection("Segregation", difficulty_multiplier=1.5)
SORS = QuizQuestionCollection(
    "Sexual Orientation and Relationship Status", difficulty_multiplier=0.5
)
TRAFFIC_ACCIDENTS = QuizQuestionCollection("Traffic Accidents", difficulty_multiplier=3)
COMMUTE_TIME = QuizQuestionCollection(
    "Commute Time", difficulty_multiplier=3, weight_entire_collection=2
)
COMMUTE_MODE = QuizQuestionCollection("Commute Mode", difficulty_multiplier=3)
VEHICLE_OWNERSHIP = QuizQuestionCollection("Vehicle Ownership", difficulty_multiplier=3)
ELECTION = QuizQuestionCollection("Election", difficulty_multiplier=3)
WEATHER = QuizQuestionCollection("Weather", difficulty_multiplier=0.3)
POLLUTION = QuizQuestionCollection("Pollution", 0.5)
