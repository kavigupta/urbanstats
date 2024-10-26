from urbanstats.acs.every_subcategory import produce_subcategories

from .load import ACSDataEntity

# pylint: disable=line-too-long

list_of_occupations_female = [
    "Estimate!!Total:",
    "Estimate!!Total:!!Female:",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Computer, engineering, and science occupations:",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Computer, engineering, and science occupations:!!Architecture and engineering occupations",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Computer, engineering, and science occupations:!!Computer and mathematical occupations",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Computer, engineering, and science occupations:!!Life, physical, and social science occupations",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Education, legal, community service, arts, and media occupations:",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Education, legal, community service, arts, and media occupations:!!Arts, design, entertainment, sports, and media occupations",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Education, legal, community service, arts, and media occupations:!!Community and social service occupations",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Education, legal, community service, arts, and media occupations:!!Educational instruction, and library occupations",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Education, legal, community service, arts, and media occupations:!!Legal occupations",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Healthcare practitioners and technical occupations:",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Healthcare practitioners and technical occupations:!!Health diagnosing and treating practitioners and other technical occupations",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Healthcare practitioners and technical occupations:!!Health technologists and technicians",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Management, business, and financial occupations:",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Management, business, and financial occupations:!!Business and financial operations occupations",
    "Estimate!!Total:!!Female:!!Management, business, science, and arts occupations:!!Management, business, and financial occupations:!!Management occupations",
    "Estimate!!Total:!!Female:!!Natural resources, construction, and maintenance occupations:",
    "Estimate!!Total:!!Female:!!Natural resources, construction, and maintenance occupations:!!Construction and extraction occupations",
    "Estimate!!Total:!!Female:!!Natural resources, construction, and maintenance occupations:!!Farming, fishing, and forestry occupations",
    "Estimate!!Total:!!Female:!!Natural resources, construction, and maintenance occupations:!!Installation, maintenance, and repair occupations",
    "Estimate!!Total:!!Female:!!Production, transportation, and material moving occupations:",
    "Estimate!!Total:!!Female:!!Production, transportation, and material moving occupations:!!Material moving occupations",
    "Estimate!!Total:!!Female:!!Production, transportation, and material moving occupations:!!Production occupations",
    "Estimate!!Total:!!Female:!!Production, transportation, and material moving occupations:!!Transportation occupations",
    "Estimate!!Total:!!Female:!!Sales and office occupations:",
    "Estimate!!Total:!!Female:!!Sales and office occupations:!!Office and administrative support occupations",
    "Estimate!!Total:!!Female:!!Sales and office occupations:!!Sales and related occupations",
    "Estimate!!Total:!!Female:!!Service occupations:",
    "Estimate!!Total:!!Female:!!Service occupations:!!Building and grounds cleaning and maintenance occupations",
    "Estimate!!Total:!!Female:!!Service occupations:!!Food preparation and serving related occupations",
    "Estimate!!Total:!!Female:!!Service occupations:!!Healthcare support occupations",
    "Estimate!!Total:!!Female:!!Service occupations:!!Personal care and service occupations",
    "Estimate!!Total:!!Female:!!Service occupations:!!Protective service occupations:",
    "Estimate!!Total:!!Female:!!Service occupations:!!Protective service occupations:!!Firefighting and prevention, and other protective service workers including supervisors",
    "Estimate!!Total:!!Female:!!Service occupations:!!Protective service occupations:!!Law enforcement workers including supervisors",
]


occupation_dict, normalize_occupation_name, occupation_display = produce_subcategories(
    "occupation", list_of_occupations_female, remove_gender=True
)
