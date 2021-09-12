from load_data import (
    get_fips_to_counties,
    get_subfips_to_subcounty_name,
    load_county_geojson,
)
from process import load_and_process_data, groupby
from mapper import produce_image

blocks = load_and_process_data()
by_subcounty = groupby(blocks, "FIPS_SUB")
by_county = groupby(blocks, "FIPS")
by_state = groupby(blocks, "STUSAB")

fips_to_counties = get_fips_to_counties()
subfips_to_subcounty_name = get_subfips_to_subcounty_name()

produce_image(
    by_state,
    by_state.mean_within_1km,
    0,
    15_000,
    "states_pop.svg",
    locationmode="USA-states",
)
# run(by_state, 1 - by_state.homogenity_within_1km, 0, 1, "states_diverse.svg", locationmode="USA-states",)
produce_image(
    by_county,
    by_county.mean_within_1km,
    0,
    15_000,
    "counties_pop.svg",
    geojson=load_county_geojson(),
)
# run(by_county, 1 - by_county.homogenity_within_1km, 0, 1, "counties_diverse.svg", geojson=counties_geojson)
by_county["Name"] = [fips_to_counties[x] for x in by_county.index]
by_subcounty["name"] = [
    subfips_to_subcounty_name.get(x, "NONE") for x in by_subcounty.index
]

by_state.sort_values("mean_within_1km").mean_within_1km.to_csv("states.csv")
by_county.to_csv("counties.csv")
by_subcounty[by_subcounty.name != "NONE"][["mean_within_1km", "name"]].to_csv(
    "subcounties.csv"
)
