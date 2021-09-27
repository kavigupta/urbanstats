from load_data import (
    get_fips_to_counties,
    get_subfips_to_subcounty_name,
)
from process import grouped_data
from mapper import produce_full_image

import addfips
import pandas as pd
import gspread


def tolist(df):
    columns = [df.index.name] + [i for i in df.columns]
    rows = [[i for i in row] for row in df.itertuples()]
    return [columns] + rows


display = {0.25: "250m", 0.5: "500m", 1: "1km", 2: "2km", 4: "4km"}
name_by_attr = {
    "by_subcounty": "Sub-county regions",
    "by_county": "Counties",
    "by_state": "States",
}

fips_to_counties = get_fips_to_counties()
subfips_to_subcounty_name = get_subfips_to_subcounty_name()

process_by_attr = {
    "by_subcounty": lambda x: subfips_to_subcounty_name.get(x, "NONE"),
    "by_county": lambda x: fips_to_counties[x],
    "by_state": lambda x: x,
}

fips_by_attr = {
    "by_subcounty": lambda x: x,
    "by_county": lambda x: x,
    "by_state": lambda x: addfips.AddFIPS().get_state_fips(x)
}


def create_csv(dbs, attribute):
    csv = pd.concat(
        [
            getattr(dbs[i], attribute).mean_density_weighted.rename(
                f"Mean within {display[i]}"
            )
            for i in sorted(display)
        ],
        axis=1,
    )
    csv["NAMES"] = [process_by_attr[attribute](x) for x in csv.index]
    csv["Fips Code"] = [fips_by_attr[attribute](x) for x in csv.index]
    csv = csv[csv["NAMES"] != "NONE"]
    csv = csv.set_index("NAMES").rename_axis(name_by_attr[attribute])
    return csv


def update_gspread(dbs, attribute):
    print("Updating sheet for", attribute)
    csv = create_csv(dbs, attribute)
    gc = gspread.service_account()
    sh = gc.open("Alternate Population Density Metric v2")
    w = sh.worksheet(name_by_attr[attribute])
    w.clear()
    w.append_rows(tolist(csv))


dbs = {i: grouped_data(radius=i) for i in display}
for i in display:
    disp = display[i]
    produce_full_image(
        by_state=dbs[i].by_state,
        by_county=dbs[i].by_county,
        out_path=f"images/{disp}.png",
        radius_display=disp,
    )

for attribute in name_by_attr:
    update_gspread(dbs, attribute)