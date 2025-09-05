import os
from permacache import permacache
import requests
import us

import pandas as pd
import urbanstats

election_data_path = os.path.join(os.path.dirname(urbanstats.__file__), "election-data")


# @permacache(
#     os.path.join("election_data_by_county", "historical_wikipedia", "load"),
#     shelf_type="individual-file",
#     driver="json",
# )
def load_for_state_and_election(state, election_year):
    state = us.states.lookup(state)
    url = f"https://en.wikipedia.org/wiki/{election_year}_United_States_presidential_election_in_{state.name.replace(' ', '_')}"
    html_text = requests.get(url).text
    print(url)
    frames = pd.read_html(html_text)
    for frame in frames:
        frame = attempt_to_standardize_frame(frame, state, election_year)
        if frame is not None:
            return frame
    raise ValueError(f"Could not find data for {state} in {election_year}")


def attempt_to_standardize_frame(frame, state, election_year):
    county_column_possibilities = [
        x for x in frame.columns if "county" in str(x).lower()
    ]
    if len(county_column_possibilities) != 1:
        return None
    county_column = county_column_possibilities[0]
    dem_column_possibilities = [
        x for x in frame.columns if "democrat" in str(x).lower()
    ]
    if len(dem_column_possibilities) != 1:
        return None
    dem_column = dem_column_possibilities[0]
    gop_column_possibilities = [
        x for x in frame.columns if "republican" in str(x).lower()
    ]
    if len(gop_column_possibilities) != 1:
        return None
    gop_column = gop_column_possibilities[0]
    total_column_possibilities = [x for x in frame.columns if "total" in str(x).lower()]
    if len(total_column_possibilities) != 1:
        return None
    total_column = total_column_possibilities[0]
    frame = frame[[county_column, dem_column, gop_column, total_column]].copy()
    frame.columns = ["name", "dem", "gop", "total"]
    return frame
