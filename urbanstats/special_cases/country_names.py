# these are all the names Wikipedia uses for countries
# the one exception is "United States" which we consistently render "USA"
import pycountry

from urbanstats.universe.universe_constants import COUNTRIES

pycountry_name_to_short_name = {
    "Bahamas": "The Bahamas",
    "Bolivia, Plurinational State of": "Bolivia",
    "Brunei Darussalam": "Brunei",
    "Cabo Verde": "Cape Verde",
    "Congo, The Democratic Republic of the": "Democratic Republic of the Congo",
    "Czechia": "Czech Republic",
    "Côte d'Ivoire": "Ivory Coast",
    "Falkland Islands (Malvinas)": "Falkland Islands",
    "Gambia": "The Gambia",
    "Holy See (Vatican City State)": "Vatican City",
    "Iran, Islamic Republic of": "Iran",
    "Korea, Democratic People's Republic of": "North Korea",
    "Korea, Republic of": "South Korea",
    "Lao People's Democratic Republic": "Laos",
    "Micronesia, Federated States of": "Micronesia",
    "Moldova, Republic of": "Moldova",
    "Palestine, State of": "State of Palestine",
    "Pitcairn": "Pitcairn Islands",
    "Russian Federation": "Russia",
    "Sao Tome and Principe": "São Tomé and Príncipe",
    "Syrian Arab Republic": "Syria",
    "Tanzania, United Republic of": "Tanzania",
    "Timor-Leste": "East Timor",
    "Venezuela, Bolivarian Republic of": "Venezuela",
    "Viet Nam": "Vietnam",
    "Virgin Islands, British": "British Virgin Islands",
    "Türkiye": "Turkey",
}


def iso_to_country(iso):
    if iso == "US":
        return "USA"
    name = pycountry.countries.get(alpha_2=iso).name
    name = pycountry_name_to_short_name.get(name, name)
    assert name in COUNTRIES
    return name
