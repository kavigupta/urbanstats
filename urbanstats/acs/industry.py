# pylint: disable=line-too-long

from urbanstats.acs.every_subcategory import produce_subcategories

list_of_industries_female = [
    "Estimate!!Total:",
    "Estimate!!Total:!!Female:",
    "Estimate!!Total:!!Female:!!Agriculture, forestry, fishing and hunting, and mining:",
    "Estimate!!Total:!!Female:!!Agriculture, forestry, fishing and hunting, and mining:!!Agriculture, forestry, fishing and hunting",
    "Estimate!!Total:!!Female:!!Agriculture, forestry, fishing and hunting, and mining:!!Mining, quarrying, and oil and gas extraction",
    "Estimate!!Total:!!Female:!!Arts, entertainment, and recreation, and accommodation and food services:",
    "Estimate!!Total:!!Female:!!Arts, entertainment, and recreation, and accommodation and food services:!!Accommodation and food services",
    "Estimate!!Total:!!Female:!!Arts, entertainment, and recreation, and accommodation and food services:!!Arts, entertainment, and recreation",
    "Estimate!!Total:!!Female:!!Construction",
    "Estimate!!Total:!!Female:!!Educational services, and health care and social assistance:",
    "Estimate!!Total:!!Female:!!Educational services, and health care and social assistance:!!Educational services",
    "Estimate!!Total:!!Female:!!Educational services, and health care and social assistance:!!Health care and social assistance",
    "Estimate!!Total:!!Female:!!Finance and insurance, and real estate, and rental and leasing:",
    "Estimate!!Total:!!Female:!!Finance and insurance, and real estate, and rental and leasing:!!Finance and insurance",
    "Estimate!!Total:!!Female:!!Finance and insurance, and real estate, and rental and leasing:!!Real estate and rental and leasing",
    "Estimate!!Total:!!Female:!!Information",
    "Estimate!!Total:!!Female:!!Manufacturing",
    "Estimate!!Total:!!Female:!!Other services, except public administration",
    "Estimate!!Total:!!Female:!!Professional, scientific, and management, and administrative, and waste management services:",
    "Estimate!!Total:!!Female:!!Professional, scientific, and management, and administrative, and waste management services:!!Administrative and support and waste management services",
    "Estimate!!Total:!!Female:!!Professional, scientific, and management, and administrative, and waste management services:!!Management of companies and enterprises",
    "Estimate!!Total:!!Female:!!Professional, scientific, and management, and administrative, and waste management services:!!Professional, scientific, and technical services",
    "Estimate!!Total:!!Female:!!Public administration",
    "Estimate!!Total:!!Female:!!Retail trade",
    "Estimate!!Total:!!Female:!!Transportation and warehousing, and utilities:",
    "Estimate!!Total:!!Female:!!Transportation and warehousing, and utilities:!!Transportation and warehousing",
    "Estimate!!Total:!!Female:!!Transportation and warehousing, and utilities:!!Utilities",
    "Estimate!!Total:!!Female:!!Wholesale trade",
]


industry_dict, normalize_industry_name, industry_display = produce_subcategories(
    "industry", list_of_industries_female, remove_gender=True
)
