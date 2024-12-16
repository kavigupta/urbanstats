# pylint: disable=line-too-long

unused = [
    # have block-level data
    "Population, 2021 (1)",
    "Total private dwellings (2)",
    "Private dwellings occupied by usual residents (3)",  # also not sure what we'd do with it
    # not included in da-level data
    "Population, 2016 (1)",
    "Population percentage change, 2016 to 2021",
    # geographic/derived
    "Population density per square kilometre",
    "Land area in square kilometres",
    # less specific version of another table
    "Total - Distribution (%) of the population by broad age groups - 100% data",
    # very similar to another table
    "Total - After-tax income groups in 2020 for the population aged 15 years and over in private households - 100% data (22)",
    "Total - Employment income groups in 2020 for the population aged 15 years and over in private households - 100% data (19)",
    "Total - Household after-tax income groups in 2020 for private households - 100% data (22)",
    "Total - Other language(s) spoken regularly at home for the total population excluding institutional residents - 100% data (42)",
    "Total - Knowledge of languages for the population in private households - 25% sample data (43)",
    "Total - Secondary (high) school diploma or equivalency certificate for the population aged 15 years and over in private households - 25% sample data (165)",
    "Total - Secondary (high) school diploma or equivalency certificate for the population aged 25 to 64 years in private households - 25% sample data (165)",
    "Total - Highest certificate, diploma or degree for the population aged 15 years and over in private households - 25% sample data (165)",
    "Total - Major field of study - Classification of Instructional Programs (CIP) 2021 for the population aged 15 years and over in private households - 25% sample data (172)",
    # not interested in this
    "Total - Commuting destination for the employed labour force aged 15 years and over with a usual place of work - 25% sample data (199)",
    # transient data
    "Total - Employment income statistics in 2020 for the population aged 15 years and over in private households - 25% sample data (12)",
    "Total - Population aged 15 years and over by labour force status - 25% sample data (184)",
    "Participation rate",
    "Employment rate",
    "Unemployment rate",
    "Total - Population aged 15 years and over by work activity during the reference year - 25% sample data (185)",
    "Total - Labour force aged 15 years and over by class of worker including job permanency - 25% sample data (189)",
    # non-aggregatable and/or computable by other means
    "Average age of the population",
    "Median age of the population",
    "Number of persons in private households",
    "Average household size",
    "Average size of census families",
    "Average number of children in census families with children (6)",
    "Total number of census families in private households - 100% data",
    "Total - Inequality measures for the population in private households - 100% data (35)",
    "Average number of rooms per dwelling",
    ## these are mean and median
    "Total - Income statistics in 2020 for the population aged 15 years and over in private households - 100% data (10)",
    "Total - Income statistics in 2020 for the population aged 15 years and over in private households - 25% sample data (11)",
    "Total - Income statistics in 2019 for the population aged 15 years and over in private households - 100% data (23)",
    "Total - Income statistics in 2019 for the population aged 15 years and over in private households - 25% sample data (24)",
    "Total - Employment income statistics in 2019 for the population aged 15 years and over in private households - 25% sample data (25)",
    "Total - Income statistics for private households - 100% data (26)",
    "Total - Income statistics for private households - 25% sample data (27)",
    "Total - Income statistics for economic families in private households - 100% data (28)",
    "Total - Income statistics for couple-only economic families in private households - 100% data",
    "Total - Income statistics for couple-with-children economic families in private households - 100% data",
    "Total - Income statistics for one-parent economic families in private households - 100% data",
    "Total - Income statistics for persons aged 15 years and over not in economic families in private households - 100% data (29)",
    "Total - Income statistics for economic families in private households - 25% sample data (31)",
    "Total - Income statistics for couple-only economic families in private households - 25% sample data",
    "Total - Income statistics for couple-with-children economic families in private households - 25% sample data",
    "Total - Income statistics for one-parent economic families in private households - 25% sample data",
    "Total - Income statistics for persons aged 15 years and over not in economic families in private households - 25% sample data (32)",
    ## quantiles
    "Total - Adjusted after-tax economic family income decile group for the population in private households - 100% data (34)",
    # Not doing LIM because it's completely different from census poverty. Using LICO-AT because
    # it's all they have
    "Total - LIM low-income status in 2020 for the population in private households - 100% data (33)",
    "In low income based on the Low-income measure, after tax (LIM-AT)",
    "Prevalence of low income based on the Low-income measure, after tax (LIM-AT) (%)",
    "Total - LICO low-income status in 2020 for the population in private households to whom the low-income concept is applicable - 100% data (33)",
    "Prevalence of low income based on the Low-income cut-offs, after tax (LICO-AT) (%)",
    "Total - Admission category and applicant type for the immigrant population in private households who were admitted between 1980 and 2021 - 25% sample data (103)",
    "Total - Pre-admission experience for the immigrant population in private households who were admitted between 1980 and 2021 - 25% sample data (110)",
]

get_to_these_later = [
    "Total - Occupied private dwellings by structural type of dwelling - 100% data",
    "Total - Private households by household size - 100% data",
    "Total - Census families in private households by family size - 100% data (5)",
    "Total - Persons in private households - 100% data",
    "Total - Household type - 100% data",
    "Composition of total income in 2020 of the population aged 15 years and over in private households (%) - 25% sample data (17)",
    "Composition of total income in 2019 of the population aged 15 years and over in private households (%) - 25% sample data",
    "Total - Knowledge of official languages for the total population excluding institutional residents - 100% data (36)",
    "Total - First official language spoken for the total population excluding institutional residents - 100% data (37)",
    "Total - Mother tongue for the total population excluding institutional residents - 100% data (38)",
    "Total - All languages spoken at home for the total population excluding institutional residents - 100% data (40)",
    "Total - Indigenous identity for the population in private households - 25% sample data (44)",
    "Total - Registered or Treaty Indian status for the population in private households - 25% sample data (44)",
    "Total - Private households by tenure - 25% sample data (50)",
    "Total - Occupied private dwellings by condominium status - 25% sample data (51)",
    "Total - Occupied private dwellings by number of bedrooms - 25% sample data (52)",
    "Total - Occupied private dwellings by number of rooms - 25% sample data (53)",
    "Total - Private households by number of persons per room - 25% sample data (54)",
    "Total - Private households by housing suitability - 25% sample data (55)",
    "Total - Occupied private dwellings by dwelling condition - 25% sample data (58)",
    "Total - Private households by number of household maintainers - 25% sample data (59)",
    "Total - Private households by age of primary household maintainers - 25% sample data (60)",
    "Total - Occupied private dwellings by housing indicators - 25% sample data (62)",
    "Total - Owner and tenant households with household total income greater than zero and shelter-cost-to-income ratio less than 100%, in non-farm, non-reserve private dwellings - 25% sample data (63)",
    "Total - Households living in a dwelling provided by the local government, First Nation or Indian band in non-farm private dwellings - 25% sample data",
    "Total - Age at immigration for the immigrant population in private households - 25% sample data (84)",
    "Total - Place of birth for the immigrant population in private households - 25% sample data (85)",
    "Total - Place of birth for the recent immigrant population in private households - 25% sample data (94)",
    "Total - Generation status for the population in private households - 25% sample data (99)",
    "Total - Ethnic or cultural origin for the population in private households - 25% sample data (121)",
    "Total - Mobility status 1 year ago - 25% sample data (163)",
    "Total - Mobility status 5 years ago - 25% sample data (164)",
    "Total - Location of study compared with province or territory of residence for the population aged 25 to 64 years in private households - 25% sample data (180)",
    "Total - All languages used at work for the population in private households aged 15 years and over who worked since January 1, 2020 - 25% sample data (195)",
    "Total - Language used most often at work for the population aged 15 years and over who worked since January 1, 2020, in private households, 2021 Census - 25% sample data (196)",
    "Total - Other language(s) used regularly at work for the population in private households aged 15 years and over who worked since January 1, 2020 - 25% sample data (197)",
    "Total - Time leaving for work for the employed labour force aged 15 years and over with a usual place of work or no fixed workplace address - 25% sample data (202)",
    "Total - Eligibility for instruction in the minority official language for the population in private households born in 2003 or later - 100% data (203)",
    "Total - Eligibility and instruction in the minority official language, for the population in private households born between 2003 and 2015 (inclusive) - 100% data (204)",
]

completed = [
    "Total - Age groups of the population - 100% data",
    "Total - Marital status for the total population aged 15 years and over - 100% data",
    "Total - Labour force aged 15 years and over by industry - Sectors - North American Industry Classification System (NAICS) 2017 - 25% sample data (194)",
    "Total - Commuting duration for the employed labour force aged 15 years and over with a usual place of work or no fixed workplace address - 25% sample data (201)",
    "Total - Total income groups in 2020 for the population aged 15 years and over in private households - 100% data (21)",
    "Total - Household total income groups in 2020 for private households - 100% data (21)",
    "In low income based on the Low-income cut-offs, after tax (LICO-AT)",
    "Total - Highest certificate, diploma or degree for the population aged 25 to 64 years in private households - 25% sample data (165)",
]

get_to_these_now = [
    "Total - Language spoken most often at home for the total population excluding institutional residents - 100% data (41)",
    "Total - Occupied private dwellings by period of construction - 25% sample data (56)",
    "Total - Owner and tenant households with household total income greater than zero, in non-farm, non-reserve private dwellings by shelter-cost-to-income ratio - 25% sample data (61)",
    # together these can get Renter %
    *[
        "Total - Owner households in non-farm, non-reserve private dwellings - 25% sample data",
        "Total - Tenant households in non-farm, non-reserve private dwellings - 25% sample data",
    ],
    # together these can get our origin stats
    *[
        "Total - Citizenship for the population in private households - 25% sample data (76)",
        "Total - Immigrant status and period of immigration for the population in private households - 25% sample data (79)",
    ],
    # together these can get Race
    [
        "Total - Indigenous ancestry for the population in private households - 25% sample data (68)",
        "Total - Visible minority for the population in private households - 25% sample data (117)",
    ],
    "Total - Religion for the population in private households - 25% sample data (161)",
    "Total - Major field of study - Classification of Instructional Programs (CIP) 2021 for the population aged 25 to 64 years in private households - 25% sample data (172)",
    "Total - Labour force aged 15 years and over by occupation - Broad category - National Occupational Classification (NOC) 2021 - 25% sample data (193)",
    # together these allow us to compute commute mode %
    *[
        "Total - Place of work status for the employed labour force aged 15 years and over - 25% sample data (198)",
        "Total - Main mode of commuting for the employed labour force aged 15 years and over with a usual place of work or no fixed workplace address - 25% sample data (200)",
    ],
]
