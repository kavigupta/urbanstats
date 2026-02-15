from dataclasses import dataclass
from types import NoneType

from urbanstats.data.census_blocks import RADII
from urbanstats.data.gpw import GPW_RADII

from .stat_path import get_statistic_column_path


@dataclass(frozen=True)
class Source:
    """
    Represents a source of statistics. Provides a category for the sourcing
    """

    category: str
    name: str
    is_default: bool
    priority: int
    variable_suffix: str

    def json(self):
        return {"category": self.category, "name": self.name}


@dataclass
class MultiSource:
    """
    Represent a statistic that is available from multiple sources.
    """

    by_source: dict[str | NoneType, str]
    multi_source_colname: str = None
    indented_name: str = None

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
        output = dict(name=self.compute_name(name_map), stats=result)
        output["indentedName"] = self.indented_name
        return output

    def canonical_column(self):
        if self.multi_source_colname is not None:
            return self.multi_source_colname
        assert len(self.by_source) == 1
        col = next(iter(self.by_source.values()))
        return col

    def compute_name(self, name_map):
        return name_map[self.canonical_column()]


@dataclass
class StatisticGroup:
    """
    Represents a statistic that is available for multiple years.
    """

    by_year: dict[int | NoneType, list[MultiSource]]
    group_name_statcol: str = None
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
        for _, stats in self.by_year.items():
            for stat_by_source in stats:
                result.update(stat_by_source.name_to_category(category_id))
        return result

    @staticmethod
    def flatten_year(year, stats, name_map, names):
        assert isinstance(year, int) or year is None, year
        stats_processed = []
        for stat in stats:
            stats_processed.append(stat.flatten(name_map, names))

        return {"year": year, "stats_by_source": stats_processed}

    def flatten(self, name_map, group_id):
        group_id = get_statistic_column_path(group_id)
        return {
            "id": group_id,
            "name": self.compute_group_name(name_map),
            "contents": [
                self.flatten_year(year, stats, name_map, list(name_map))
                for year, stats in self.by_year.items()
            ],
        }

    def compute_group_name(self, name_map):
        if self.group_name is not None:
            assert self.group_name_statcol is None
            return self.group_name
        short_statcol = self.group_name_statcol
        if short_statcol is None:
            year = None if None in self.by_year else max(self.by_year)
            short_statcol = self.by_year[year][0].by_source[None]
        group_name = name_map[short_statcol]
        if len(self.by_year) > 1:
            for year in self.by_year:
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


def single_source(col_name, indented_name=None):
    return MultiSource({None: col_name}, indented_name=indented_name)


def census_basics(col_name, *, change):
    results = {
        2020: [single_source(col_name, indented_name="2020")],
    }
    for year in [2010, 2000]:
        results[year] = [single_source(f"{col_name}_{year}", indented_name=f"{year}")]
        if change:
            results[year].append(
                single_source(
                    f"{col_name}_change_{year}", indented_name=f"{year}-2020 Change"
                )
            )
    results = StatisticGroup(results)
    return {col_name: results}


def census_segregation(col_name):
    return {
        col_name: StatisticGroup(
            {
                2000: [
                    single_source(f"{col_name}_2000", indented_name="2000"),
                    single_source(
                        f"{col_name}_diff_2000", indented_name="2000-2020 Change"
                    ),
                ],
                2010: [
                    single_source(f"{col_name}_2010", indented_name="2010"),
                    single_source(
                        f"{col_name}_diff_2010", indented_name="2010-2020 Change"
                    ),
                ],
                2020: [single_source(f"{col_name}_2020", indented_name="2020")],
            }
        )
    }


def just_2020(*col_names, year=2020):
    return {
        col_name: StatisticGroup(
            {year: [single_source(col_name, indented_name="2020")]}
        )
        for col_name in col_names
    }


def just_2020_with_canada(*col_names, year=2020):
    return {
        col_name: StatisticGroup(
            {
                year: [
                    MultiSource(
                        {
                            population_census: col_name,
                            population_canada: col_name + "_canada",
                        },
                        col_name,
                        indented_name="2020",
                    )
                ]
            },
            group_name_statcol=col_name,
        )
        for col_name in col_names
    }


def just_2020_canada_only(*col_names, year=2020):
    return {
        col_name: StatisticGroup(
            {
                year: [
                    MultiSource(
                        {
                            population_canada: f"{col_name}_canada",
                        },
                        indented_name="2020",
                    )
                ]
            },
            group_name_statcol=f"{col_name}_canada",
        )
        for col_name in col_names
    }


def just_2020_category(cat_key, cat_name, *col_names, year=2020):
    return {
        cat_key: StatisticCategory(
            name=cat_name,
            contents=just_2020(*col_names, year=year),
        )
    }


def just_2020_category_with_canada(cat_key, cat_name, *col_names, year=2020):
    return {
        cat_key: StatisticCategory(
            name=cat_name,
            contents=just_2020_with_canada(*col_names, year=year),
        )
    }


population_census = Source(
    "Population", "US Census", is_default=True, priority=1, variable_suffix="us_census"
)
population_canada = Source(
    "Population",
    "Canadian Census",
    is_default=True,
    priority=2,
    variable_suffix="statcan",
)
population_ghsl = Source(
    "Population", "GHSL", is_default=False, priority=10, variable_suffix="ghsl"
)


def census_basics_with_ghs_and_canada(col_name, gpw_name, canada_name, *, change):
    result = census_basics(col_name, change=change)
    by_source = {
        population_census: col_name,
        population_canada: canada_name,
        population_ghsl: gpw_name,
    }
    by_source = {k: v for k, v in by_source.items() if v is not None}
    result[col_name].by_year[2020] = [
        MultiSource(by_source, col_name, indented_name="2020")
    ]
    # Also add Canadian 2011 data directly associated with 2010 US census
    assert "_2021_" in canada_name, f"{canada_name!r}"
    canada_2011_name = canada_name.replace("_2021_", "_2011_")
    result[col_name].by_year[2010] = [
        MultiSource(
            {
                population_census: f"{col_name}_2010",
                population_canada: canada_2011_name,
            },
            f"{col_name}_2010",
            indented_name="2010",
        )
    ]
    if change:
        # Add both US and Canadian change statistics
        result[col_name].by_year[2010].append(
            MultiSource(
                {
                    population_census: f"{col_name}_change_2010",
                    population_canada: canada_2011_name.replace("_2011_", "_change_2011_"),
                },
                f"{col_name}_change_2010",
                indented_name="2010-2020 Change",
            )
        )
    result[col_name].group_name_statcol = col_name
    return result


def census_basics_with_canada(col_name, canada_name=None, *, change):
    if canada_name is None:
        canada_name = f"{col_name}_canada"
    result = census_basics(col_name, change=change)
    by_source = {
        population_census: col_name,
        population_canada: canada_name,
    }
    result[col_name].by_year[2020] = [
        MultiSource(by_source, col_name, indented_name="2020")
    ]
    result[col_name].group_name_statcol = col_name
    return result


statistics_tree = StatisticTree(
    {
        "main": StatisticCategory(
            name="Main",
            contents={
                **census_basics_with_ghs_and_canada(
                    "population",
                    "gpw_population",
                    "population_2021_canada",
                    change=True,
                ),
                **census_basics_with_ghs_and_canada(
                    "ad_1", "gpw_pw_density_1", "density_2021_pw_1_canada", change=True
                ),
                **census_basics_with_ghs_and_canada(
                    "sd", "gpw_aw_density", "sd_2021_canada", change=False
                ),
                "area": StatisticGroup({None: [single_source("area")]}),
                "compactness": StatisticGroup({None: [single_source("compactness")]}),
            },
        ),
        **just_2020_category(
            "topography",
            "Topography",
            "gridded_hilliness",
            "gridded_elevation",
        ),
        "race": StatisticCategory(
            name="Race",
            contents={
                **census_basics_with_canada("white", change=False),
                **census_basics_with_canada("hispanic", change=False),
                **census_basics_with_canada("black", change=False),
                **census_basics_with_canada("asian", change=False),
                **census_basics_with_canada("native", change=False),
                **census_basics_with_canada("hawaiian_pi", change=False),
                **census_basics_with_canada("other / mixed", change=False),
                **census_segregation("homogeneity_250"),
                **census_segregation("segregation_250"),
                **census_segregation("segregation_250_10"),
            },
        ),
        "national_origin": StatisticCategory(
            name="National Origin",
            contents={
                **just_2020_with_canada(
                    "citizenship_citizen_by_birth",
                    "citizenship_citizen_by_naturalization",
                    "citizenship_not_citizen",
                ),
                **just_2020(
                    "birthplace_non_us",
                    "birthplace_us_not_state",
                    "birthplace_us_state",
                ),
                **just_2020_with_canada(
                    "language_english_only",
                    "language_spanish",
                ),
                **just_2020_canada_only(
                    "language_french",
                    "language_other_non_french",
                ),
                **just_2020(
                    "language_other",
                ),
            },
        ),
        "religion": StatisticCategory(
            name="Religion",
            contents={
                **just_2020_canada_only(
                    "religion_no_religion",
                    "religion_catholic",
                    "religion_protestant",
                    "religion_hindu",
                    "religion_jewish",
                    "religion_muslim",
                    "religion_sikh",
                    "religion_buddhist",
                    "religion_other",
                ),
            },
        ),
        **just_2020_category(
            "education",
            "Education",
            "education_high_school",
            "education_ugrad",
            "education_grad",
            "education_high_school_canada",
            "education_ugrad_canada",
            "education_grad_canada",
            "education_field_stem",
            "education_field_humanities",
            "education_field_business",
            "education_field_stem_canada",
            "education_field_humanities_canada",
            "education_field_business_canada",
            "female_hs_gap_4",
            "female_ugrad_gap_4",
            "female_grad_gap_4",
        ),
        **just_2020_category_with_canada(
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
            "median_household_income",
            "poverty_below_line",
            "lico_at_canada",
            "lim_at_canada",
            "household_income_under_50k",
            "household_income_50k_to_100k",
            "household_income_over_100k",
            "household_income_under_50cad",
            "household_income_50_to_100cad",
            "household_income_above_100_cad",
            "individual_income_under_50k",
            "individual_income_50k_to_100k",
            "individual_income_over_100k",
            "individual_income_under_50cad",
            "individual_income_50_to_100cad",
            "individual_income_above_100_cad",
        ),
        "housing": StatisticCategory(
            name="Housing",
            contents={
                **census_basics("housing_per_pop", change=False),
                **census_basics_with_canada("housing_per_person", change=False),
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
                ),
                **just_2020_with_canada(
                    "rent_or_own_rent",
                ),
                **just_2020_canada_only(
                    "housing_per_adult",
                    "rent_burden_over_30",
                ),
            },
        ),
        "transportation": StatisticCategory(
            name="Transportation",
            contents={
                **just_2020_with_canada(
                    "transportation_means_car_no_wfh",
                    "transportation_means_bike_no_wfh",
                    "transportation_means_walk_no_wfh",
                    "transportation_means_transit_no_wfh",
                ),
                **just_2020_with_canada(
                    "transportation_commute_time_median",
                    "transportation_commute_time_under_15",
                    "transportation_commute_time_15_to_29",
                    "transportation_commute_time_30_to_59",
                    "transportation_commute_time_over_60",
                ),
                **just_2020(
                    "vehicle_ownership_none",
                    "vehicle_ownership_at_least_1",
                    "vehicle_ownership_at_least_2",
                    "traffic_fatalities_last_decade_per_capita",
                    "traffic_fatalities_ped_last_decade_per_capita",
                    "traffic_fatalities_last_decade",
                    "traffic_fatalities_ped_last_decade",
                ),
            },
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
            "life_expectancy_2019",
            "performance_score_adj_2019",
        ),
        **just_2020_category(
            "climate_change",
            "Environment",
            "pm_25_2018_2022",
            "heating_utility_gas",
            "heating_electricity",
            "heating_bottled_tank_lp_gas",
            "heating_feul_oil_kerosene",
            "heating_other",
            "heating_no",
        ),
        **just_2020_category_with_canada(
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
        "occupation": StatisticCategory(
            name="Occupation",
            contents={
                **just_2020(
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
                **just_2020_canada_only(
                    "occupation_legislative_and_senior_management",
                    "occupation_business_finance_and_administration",
                    "occupation_natural_and_applied_sciences",
                    "occupation_health",
                    "occupation_education_law_social_community_government",
                    "occupation_art_culture_recreation_sport",
                    "occupation_sales_and_service",
                    "occupation_trades_transport_equipment",
                    "occupation_natural_resources_agriculture",
                    "occupation_manufacturing_utilities",
                ),
            },
        ),
        "relationships": StatisticCategory(
            name="Relationships",
            contents={
                **just_2020(
                    "sors_unpartnered_householder",
                    "sors_cohabiting_partnered_gay",
                    "sors_cohabiting_partnered_straight",
                    "sors_child",
                    "sors_other",
                ),
                **just_2020_with_canada(
                    "marriage_never_married",
                    "marriage_married_not_divorced",
                    "marriage_divorced",
                ),
            },
        ),
        "election": StatisticCategory(
            name="Election",
            contents={
                "us_presidential_election": StatisticGroup(
                    {
                        2010: [
                            single_source(col_name, indented_name=indented_name)
                            for (col_name, indented_name) in [
                                (("2008 Presidential Election", "margin"), "2008"),
                                (("2008-2012 Swing", "margin"), "2008-2012 Swing"),
                                (("2012 Presidential Election", "margin"), "2012"),
                                (("2012-2016 Swing", "margin"), "2012-2016 Swing"),
                            ]
                        ],
                        2020: [
                            single_source(col_name, indented_name=indented_name)
                            for (col_name, indented_name) in [
                                (("2016 Presidential Election", "margin"), "2016"),
                                (("2016-2020 Swing", "margin"), "2016-2020 Swing"),
                                (("2020 Presidential Election", "margin"), "2020"),
                                (("2020-2024 Swing", "margin"), "2020-2024 Swing"),
                                (("2024 Presidential Election", "margin"), "2024"),
                            ]
                        ],
                    },
                    group_name="US Presidential Election",
                ),
                "canada_general_election_coalition_margin": StatisticGroup(
                    {
                        2020: [
                            single_source(col_name, indented_name=indented_name)
                            for (col_name, indented_name) in [
                                (("2015GE", "coalition_margin"), "2015"),
                                (
                                    ("2015-2019 Swing", "coalition_margin"),
                                    "2015-2019 Swing",
                                ),
                                (("2019GE", "coalition_margin"), "2019"),
                                (
                                    ("2019-2021 Swing", "coalition_margin"),
                                    "2019-2021 Swing",
                                ),
                                (("2021GE", "coalition_margin"), "2021"),
                                (
                                    ("2021-2025 Swing", "coalition_margin"),
                                    "2021-2025 Swing",
                                ),
                                (("2025GE", "coalition_margin"), "2025"),
                            ]
                        ],
                    },
                    group_name="Canadian GE: 2-Coalition Margin",
                ),
                "canada_general_election_lib": StatisticGroup(
                    {
                        2020: [
                            single_source(col_name, indented_name=indented_name)
                            for (col_name, indented_name) in [
                                (("2015GE", "V_LIB"), "2015"),
                                (("2015-2019 Swing", "V_LIB"), "2015-2019 Swing"),
                                (("2019GE", "V_LIB"), "2019"),
                                (("2019-2021 Swing", "V_LIB"), "2019-2021 Swing"),
                                (("2021GE", "V_LIB"), "2021"),
                                (("2021-2025 Swing", "V_LIB"), "2021-2025 Swing"),
                                (("2025GE", "V_LIB"), "2025"),
                            ]
                        ],
                    },
                    group_name="Canadian GE: Liberal",
                ),
                "canada_general_election_con": StatisticGroup(
                    {
                        2020: [
                            single_source(col_name, indented_name=indented_name)
                            for (col_name, indented_name) in [
                                (("2015GE", "V_CON"), "2015"),
                                (("2015-2019 Swing", "V_CON"), "2015-2019 Swing"),
                                (("2019GE", "V_CON"), "2019"),
                                (("2019-2021 Swing", "V_CON"), "2019-2021 Swing"),
                                (("2021GE", "V_CON"), "2021"),
                                (("2021-2025 Swing", "V_CON"), "2021-2025 Swing"),
                                (("2025GE", "V_CON"), "2025"),
                            ]
                        ],
                    },
                    group_name="Canadian GE: Conservative",
                ),
                "canada_general_election_ndp": StatisticGroup(
                    {
                        2020: [
                            single_source(col_name, indented_name=indented_name)
                            for (col_name, indented_name) in [
                                (("2015GE", "V_NDP"), "2015"),
                                (("2015-2019 Swing", "V_NDP"), "2015-2019 Swing"),
                                (("2019GE", "V_NDP"), "2019"),
                                (("2019-2021 Swing", "V_NDP"), "2019-2021 Swing"),
                                (("2021GE", "V_NDP"), "2021"),
                                (("2021-2025 Swing", "V_NDP"), "2021-2025 Swing"),
                                (("2025GE", "V_NDP"), "2025"),
                            ]
                        ],
                    },
                    group_name="Canadian GE: NDP",
                ),
                "canada_general_election_bq": StatisticGroup(
                    {
                        2020: [
                            single_source(col_name, indented_name=indented_name)
                            for (col_name, indented_name) in [
                                (("2015GE", "V_BQ"), "2015"),
                                (("2015-2019 Swing", "V_BQ"), "2015-2019 Swing"),
                                (("2019GE", "V_BQ"), "2019"),
                                (("2019-2021 Swing", "V_BQ"), "2019-2021 Swing"),
                                (("2021GE", "V_BQ"), "2021"),
                                (("2021-2025 Swing", "V_BQ"), "2021-2025 Swing"),
                                (("2025GE", "V_BQ"), "2025"),
                            ]
                        ],
                    },
                    group_name="Canadian GE: Bloc Québécois",
                ),
                "canada_general_election_grn": StatisticGroup(
                    {
                        2020: [
                            single_source(col_name, indented_name=indented_name)
                            for (col_name, indented_name) in [
                                (("2015GE", "V_GRN"), "2015"),
                                (("2015-2019 Swing", "V_GRN"), "2015-2019 Swing"),
                                (("2019GE", "V_GRN"), "2019"),
                                (("2019-2021 Swing", "V_GRN"), "2019-2021 Swing"),
                                (("2021GE", "V_GRN"), "2021"),
                                (("2021-2025 Swing", "V_GRN"), "2021-2025 Swing"),
                                (("2025GE", "V_GRN"), "2025"),
                            ]
                        ],
                    },
                    group_name="Canadian GE: Green",
                ),
                "canada_general_election_ppc": StatisticGroup(
                    {
                        2020: [
                            single_source(col_name, indented_name=indented_name)
                            for (col_name, indented_name) in [
                                (("2019GE", "V_PPC"), "2019"),
                                (("2019-2021 Swing", "V_PPC"), "2019-2021 Swing"),
                                (("2021GE", "V_PPC"), "2021"),
                                (("2021-2025 Swing", "V_PPC"), "2021-2025 Swing"),
                                (("2025GE", "V_PPC"), "2025"),
                            ]
                        ],
                    },
                    group_name="Canadian GE: PPC",
                ),
            },
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
            "mean_low_temp",
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
            "mean_high_temp_djf",
            "mean_high_temp_mam",
            "mean_high_temp_jja",
            "mean_high_temp_son",
            "mean_low_temp_djf",
            "mean_low_temp_mam",
            "mean_low_temp_jja",
            "mean_low_temp_son",
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
                k: v
                for kvs in [
                    census_basics_with_ghs_and_canada(
                        f"ad_{r}",
                        f"gpw_pw_density_{r}" if r in GPW_RADII else None,
                        f"density_2021_pw_{r}_canada",
                        change=True,
                    )
                    for r in RADII
                    if r != 1
                ]
                for k, v in kvs.items()
            },
        ),
        **just_2020_category(
            "deprecated",
            "Deprecated",
            "mean_high_temp_summer_4",
            "mean_high_temp_winter_4",
            "mean_high_temp_fall_4",
            "mean_high_temp_spring_4",
            "transportation_means_car",
            "transportation_means_bike",
            "transportation_means_walk",
            "transportation_means_transit",
            "transportation_means_worked_at_home",
        ),
    }
)
