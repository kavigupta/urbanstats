from dataclasses import dataclass
from types import NoneType

from .stat_path import get_statistic_column_path


@dataclass(frozen=True)
class Source:
    """
    Represents a source of statistics. Provides a category for the sourcing
    """

    category: str
    name: str

    def json(self):
        return {"category": self.category, "name": self.name}


@dataclass
class MultiSource:
    """
    Represent a statistic that is available from multiple sources.
    """

    by_source: dict[str | NoneType, str]
    multi_source_name: str = None

    def __post_init__(self):
        if None in self.by_source:
            assert len(self.by_source) == 1
        for source, col in self.by_source.items():
            assert isinstance(source, Source) or source is None
            assert isinstance(col, (str, tuple))

    def internal_statistics(self):
        return list(self.by_source.values())

    def name_to_category(self, category_id):
        return {col: category_id for col in self.by_source.values()}

    def flatten(self, name_map, names):
        result = []
        for source, col in self.by_source.items():
            result.append(
                {
                    "source": source.json() if source is not None else None,
                    "column": names.index(col),
                }
            )
        return dict(name=self.compute_name(name_map), stats=result)

    def compute_name(self, name_map):
        if self.multi_source_name is not None:
            return self.multi_source_name
        assert len(self.by_source) == 1
        col = next(iter(self.by_source.values()))
        return name_map[col]


@dataclass
class StatisticGroup:
    """
    Represents a statistic that is available for multiple years.
    """

    by_year: dict[int | NoneType, list[MultiSource]]
    group_name: str = None

    def __post_init__(self):
        for year, cols in self.by_year.items():
            assert year in {2000, 2010, 2020, None}
            assert isinstance(cols, list)
            assert all(isinstance(col, MultiSource) for col in cols), cols

    def internal_statistics(self):
        return [
            col
            for multi_sources in self.by_year.values()
            for multi_source in multi_sources
            for col in multi_source.internal_statistics()
        ]

    def name_to_category(self, category_id):
        result = {}
        for year, stats in self.by_year.items():
            for stat_by_source in stats:
                category_id_to_use = {
                    "distance_from_features": "feature",
                    "climate_change": "climate",
                }.get(category_id, category_id)
                category_id_to_use = (
                    category_id_to_use if year in {2020, None} else str(year)
                )
                result.update(stat_by_source.name_to_category(category_id_to_use))
        return result

    @staticmethod
    def flatten_year(year, stats, name_map, names):
        assert isinstance(year, int) or year is None, year
        stats_processed = []
        for stat in stats:
            stats_processed.append(stat.flatten(name_map, names))

        return {"year": year, "stats_by_source": stats_processed}

    def flatten(self, name_map, group_id):
        group_name = self.compute_group_name(name_map)

        group_id = get_statistic_column_path(group_id)
        return {
            "id": group_id,
            "name": group_name,
            "contents": [
                self.flatten_year(year, stats, name_map, list(name_map))
                for year, stats in self.by_year.items()
            ],
        }

    def compute_group_name(self, name_map):
        group_name = self.group_name
        if group_name is None:
            year = None if None in self.by_year else max(self.by_year)
            short_statcol = self.by_year[year][0].by_source[None]
            group_name = name_map[short_statcol]
            if len(self.by_year) > 1:
                assert not (
                    str(year) in group_name
                ), f"Group name should not contain year, but got: {group_name}"

        return group_name


@dataclass
class StatisticCategory:
    """
    Represents a category of statistics.
    """

    name: str
    contents: dict[str, StatisticGroup]

    def __post_init__(self):
        assert isinstance(self.name, str)
        assert isinstance(self.contents, dict)
        assert all(
            isinstance(value, StatisticGroup) for value in self.contents.values()
        )

    def internal_statistics(self):
        return [
            col
            for group in self.contents.values()
            for col in group.internal_statistics()
        ]

    def name_to_category(self, category_id):
        result = {}
        for _, group in self.contents.items():
            result.update(group.name_to_category(category_id))
        return result

    def flatten(self, category_id, name_map):
        return {
            "id": category_id,
            "name": self.name,
            "contents": [
                group.flatten(name_map, group_id)
                for group_id, group in self.contents.items()
            ],
        }


@dataclass
class StatisticTree:
    """
    Represents the entire tree of statistics.
    """

    categories: dict[str, StatisticCategory]

    def __post_init__(self):
        assert isinstance(self.categories, dict)
        assert all(isinstance(key, str) for key in self.categories)
        assert all(
            isinstance(value, StatisticCategory) for value in self.categories.values()
        )

    def internal_statistics(self):
        return [
            col
            for category in self.categories.values()
            for col in category.internal_statistics()
        ]

    def name_to_category(self):
        result = {}
        for category_id, category in self.categories.items():
            result.update(category.name_to_category(category_id))
        return result

    def flatten(self, name_map):
        return [
            category.flatten(category_id, name_map)
            for category_id, category in self.categories.items()
        ]

    def all_sources(self):
        result = []
        for category in self.categories.values():
            for group in category.contents.values():
                for stats in group.by_year.values():
                    for stat in stats:
                        for source in stat.by_source:
                            result.append(source)
        deduplicated_sources = []
        for source in result:
            if source not in deduplicated_sources and source is not None:
                deduplicated_sources.append(source)
        return deduplicated_sources


def single_source(col_name):
    return MultiSource({None: col_name})


def census_basics(col_name, *, change):
    results = {
        2020: [single_source(col_name)],
    }
    for year in [2010, 2000]:
        results[year] = [single_source(f"{col_name}_{year}")]
        if change:
            results[year].append(single_source(f"{col_name}_change_{year}"))
    results = StatisticGroup(results)
    return {col_name: results}


def census_segregation(col_name):
    return {
        col_name: StatisticGroup(
            {
                2000: [
                    single_source(f"{col_name}_2000"),
                    single_source(f"{col_name}_diff_2000"),
                ],
                2010: [
                    single_source(f"{col_name}_2010"),
                    single_source(f"{col_name}_diff_2010"),
                ],
                2020: [single_source(f"{col_name}_2020")],
            }
        )
    }


def just_2020(*col_names):
    return {
        col_name: StatisticGroup({2020: [single_source(col_name)]})
        for col_name in col_names
    }


def just_2020_category(cat_key, cat_name, *col_names):
    return {
        cat_key: StatisticCategory(
            name=cat_name,
            contents=just_2020(*col_names),
        )
    }


population_census = Source("Population", "US Census")
population_ghsl = Source("Population", "GHSL")

statistics_tree = StatisticTree(
    {
        "main": StatisticCategory(
            name="Main",
            contents={
                "population": StatisticGroup(
                    {
                        2020: [
                            MultiSource(
                                {
                                    population_census: "population",
                                    population_ghsl: "gpw_population",
                                },
                                "Population",
                            )
                        ],
                        2010: [
                            single_source("population_2010"),
                            single_source("population_change_2010"),
                        ],
                        2000: [
                            single_source("population_2000"),
                            single_source("population_change_2000"),
                        ],
                    },
                    group_name="Population",
                ),
                **census_basics("ad_1", change=True),
                **census_basics("sd", change=False),
                **just_2020(
                    "gpw_pw_density_1",
                    "gpw_aw_density",
                ),
                "area": StatisticGroup({None: [single_source("area")]}),
                "compactness": StatisticGroup({None: [single_source("compactness")]}),
            },
        ),
        "race": StatisticCategory(
            name="Race",
            contents={
                **census_basics("white", change=False),
                **census_basics("hispanic", change=False),
                **census_basics("black", change=False),
                **census_basics("asian", change=False),
                **census_basics("native", change=False),
                **census_basics("hawaiian_pi", change=False),
                **census_basics("other / mixed", change=False),
                **census_segregation("homogeneity_250"),
                **census_segregation("segregation_250"),
                **census_segregation("segregation_250_10"),
            },
        ),
        **just_2020_category(
            "national_origin",
            "National Origin",
            "citizenship_citizen_by_birth",
            "citizenship_citizen_by_naturalization",
            "citizenship_not_citizen",
            "birthplace_non_us",
            "birthplace_us_not_state",
            "birthplace_us_state",
            "language_english_only",
            "language_spanish",
            "language_other",
        ),
        **just_2020_category(
            "education",
            "Education",
            "education_high_school",
            "education_ugrad",
            "education_grad",
            "education_field_stem",
            "education_field_humanities",
            "education_field_business",
            "female_hs_gap_4",
            "female_ugrad_gap_4",
            "female_grad_gap_4",
        ),
        **just_2020_category(
            "generation",
            "Generation",
            "generation_silent",
            "generation_boomer",
            "generation_genx",
            "generation_millenial",
            "generation_genz",
            "generation_genalpha",
        ),
        **just_2020_category(
            "income",
            "Income",
            "poverty_below_line",
            "household_income_under_50k",
            "household_income_50k_to_100k",
            "household_income_over_100k",
            "individual_income_under_50k",
            "individual_income_50k_to_100k",
            "individual_income_over_100k",
        ),
        "housing": StatisticCategory(
            name="Housing",
            contents={
                **census_basics("housing_per_pop", change=False),
                **census_basics("vacancy", change=False),
                **just_2020(
                    "rent_burden_under_20",
                    "rent_burden_20_to_40",
                    "rent_burden_over_40",
                    "rent_1br_under_750",
                    "rent_1br_750_to_1500",
                    "rent_1br_over_1500",
                    "rent_2br_under_750",
                    "rent_2br_750_to_1500",
                    "rent_2br_over_1500",
                    "year_built_1969_or_earlier",
                    "year_built_1970_to_1979",
                    "year_built_1980_to_1989",
                    "year_built_1990_to_1999",
                    "year_built_2000_to_2009",
                    "year_built_2010_or_later",
                    "rent_or_own_rent",
                ),
            },
        ),
        **just_2020_category(
            "transportation",
            "Transportation",
            "transportation_means_car",
            "transportation_means_bike",
            "transportation_means_walk",
            "transportation_means_transit",
            "transportation_means_worked_at_home",
            "transportation_commute_time_under_15",
            "transportation_commute_time_15_to_29",
            "transportation_commute_time_30_to_59",
            "transportation_commute_time_over_60",
            "vehicle_ownership_none",
            "vehicle_ownership_at_least_1",
            "vehicle_ownership_at_least_2",
            "traffic_fatalities_last_decade_per_capita",
            "traffic_fatalities_ped_last_decade_per_capita",
            "traffic_fatalities_last_decade",
            "traffic_fatalities_ped_last_decade",
        ),
        **just_2020_category(
            "health",
            "Health",
            "GHLTH_cdc_2",
            "PHLTH_cdc_2",
            "ARTHRITIS_cdc_2",
            "CASTHMA_cdc_2",
            "BPHIGH_cdc_2",
            "CANCER_cdc_2",
            "KIDNEY_cdc_2",
            "COPD_cdc_2",
            "CHD_cdc_2",
            "DIABETES_cdc_2",
            "OBESITY_cdc_2",
            "STROKE_cdc_2",
            "DISABILITY_cdc_2",
            "HEARING_cdc_2",
            "VISION_cdc_2",
            "COGNITION_cdc_2",
            "MOBILITY_cdc_2",
            "SELFCARE_cdc_2",
            "INDEPLIVE_cdc_2",
            "BINGE_cdc_2",
            "CSMOKING_cdc_2",
            "LPA_cdc_2",
            "SLEEP_cdc_2",
            "CHECKUP_cdc_2",
            "DENTAL_cdc_2",
            "CHOLSCREEN_cdc_2",
        ),
        **just_2020_category(
            "climate_change",
            "Climate Change",
            "heating_utility_gas",
            "heating_electricity",
            "heating_bottled_tank_lp_gas",
            "heating_feul_oil_kerosene",
            "heating_other",
            "heating_no",
        ),
        **just_2020_category(
            "industry",
            "Industry",
            "industry_agriculture,_forestry,_fishing_and_hunting",
            "industry_mining,_quarrying,_and_oil_and_gas_extraction",
            "industry_accommodation_and_food_services",
            "industry_arts,_entertainment,_and_recreation",
            "industry_construction",
            "industry_educational_services",
            "industry_health_care_and_social_assistance",
            "industry_finance_and_insurance",
            "industry_real_estate_and_rental_and_leasing",
            "industry_information",
            "industry_manufacturing",
            "industry_other_services,_except_public_administration",
            "industry_administrative_and_support_and_waste_management_services",
            "industry_management_of_companies_and_enterprises",
            "industry_professional,_scientific,_and_technical_services",
            "industry_public_administration",
            "industry_retail_trade",
            "industry_transportation_and_warehousing",
            "industry_utilities",
            "industry_wholesale_trade",
        ),
        **just_2020_category(
            "occupation",
            "Occupation",
            "occupation_architecture_and_engineering_occupations",
            "occupation_computer_and_mathematical_occupations",
            "occupation_life,_physical,_and_social_science_occupations",
            "occupation_arts,_design,_entertainment,_sports,_and_media_occupations",
            "occupation_community_and_social_service_occupations",
            "occupation_educational_instruction,_and_library_occupations",
            "occupation_legal_occupations",
            "occupation_health_diagnosing_and_treating_practitioners_and_other_technical_occupations",
            "occupation_health_technologists_and_technicians",
            "occupation_business_and_financial_operations_occupations",
            "occupation_management_occupations",
            "occupation_construction_and_extraction_occupations",
            "occupation_farming,_fishing,_and_forestry_occupations",
            "occupation_installation,_maintenance,_and_repair_occupations",
            "occupation_material_moving_occupations",
            "occupation_production_occupations",
            "occupation_transportation_occupations",
            "occupation_office_and_administrative_support_occupations",
            "occupation_sales_and_related_occupations",
            "occupation_building_and_grounds_cleaning_and_maintenance_occupations",
            "occupation_food_preparation_and_serving_related_occupations",
            "occupation_healthcare_support_occupations",
            "occupation_personal_care_and_service_occupations",
            "occupation_firefighting_and_prevention,_and_other_protective_service_workers_including_supervisors",
            "occupation_law_enforcement_workers_including_supervisors",
        ),
        **just_2020_category(
            "relationships",
            "Relationships",
            "sors_unpartnered_householder",
            "sors_cohabiting_partnered_gay",
            "sors_cohabiting_partnered_straight",
            "sors_child",
            "sors_other",
            "marriage_never_married",
            "marriage_married_not_divorced",
            "marriage_divorced",
        ),
        **just_2020_category(
            "election",
            "Election",
            ("2020 Presidential Election", "margin"),
            ("2016 Presidential Election", "margin"),
            ("2016-2020 Swing", "margin"),
        ),
        **just_2020_category(
            "distance_from_features",
            "Distance from Features",
            "park_percent_1km_v2",
            "within_Hospital_10",
            "mean_dist_Hospital_updated",
            "within_Public School_2",
            "mean_dist_Public School_updated",
            "within_Airport_30",
            "mean_dist_Airport_updated",
            "within_Active Superfund Site_10",
            "mean_dist_Active Superfund Site_updated",
            "lapophalfshare_usda_fra_1",
            "lapop1share_usda_fra_1",
            "lapop10share_usda_fra_1",
            "lapop20share_usda_fra_1",
        ),
        **just_2020_category(
            "weather",
            "Weather",
            "mean_high_temp_4",
            "mean_high_heat_index_4",
            "mean_high_dewpoint_4",
            "days_above_90_4",
            "days_between_40_and_90_4",
            "days_below_40_4",
            "days_dewpoint_70_inf_4",
            "days_dewpoint_50_70_4",
            "days_dewpoint_-inf_50_4",
            "hours_sunny_4",
            "rainfall_4",
            "snowfall_4",
            "wind_speed_over_10mph_4",
            "mean_high_temp_summer_4",
            "mean_high_temp_winter_4",
            "mean_high_temp_fall_4",
            "mean_high_temp_spring_4",
        ),
        **just_2020_category(
            "misc",
            "Miscellaneous",
            "internet_no_access",
            "insurance_coverage_none",
            "insurance_coverage_govt",
            "insurance_coverage_private",
        ),
        "other_densities": StatisticCategory(
            name="Other Density Metrics",
            contents={
                **census_basics("ad_0.25", change=True),
                **census_basics("ad_0.5", change=True),
                **census_basics("ad_2", change=True),
                **census_basics("ad_4", change=True),
                **just_2020(
                    "gpw_pw_density_2",
                    "gpw_pw_density_4",
                ),
            },
        ),
    }
)
