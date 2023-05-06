from load_data import (
    get_fips_to_counties,
    get_subfips_to_subcounty_name,
)
from process import grouped_data
from mapper import produce_full_image

import addfips
import pandas as pd
import numpy as np
import geopandas
import gspread


def tolist(df):
    columns = [df.index.name] + [i for i in df.columns]
    rows = [[i for i in row] for row in df.itertuples()]
    return [columns] + rows


display = {0.25: "250m", 0.5: "500m", 1: "1km", 2: "2km", 4: "4km"}
name_by_attr = {
    "by_zcta": "Zip Code",
    "by_subcounty": "Sub-county regions",
    "by_county": "Counties",
    "by_state": "States",
}

fips_to_counties = get_fips_to_counties()
subfips_to_subcounty_name = get_subfips_to_subcounty_name()

process_by_attr = {
    "by_zcta": lambda x: x,
    "by_subcounty": lambda x: subfips_to_subcounty_name.get(x, "NONE"),
    "by_county": lambda x: fips_to_counties[x],
    "by_state": lambda x: x,
}

fips_by_attr = {
    "by_zcta": lambda x: "-",
    "by_subcounty": lambda x: x,
    "by_county": lambda x: x,
    "by_state": lambda x: addfips.AddFIPS().get_state_fips(x),
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


def do_zctas(dbs):
    zctas = geopandas.read_file(ZCTAS_PATH)
    for i in dbs:
        zip_map = dict(zip(dbs[i].by_zcta.index, dbs[i].by_zcta.mean_density_weighted))
        zctas[f"dens{i}"] = zctas.ZCTA5CE20.map(lambda x: zip_map.get(x, np.nan))
    zctas.to_file("output-shapefiles/zip.shp")


ZCTAS_PATH = "/home/kavi/Downloads/zctas/tl_2021_us_zcta520.shp"


def main():
    year = 2020
    dbs = {i: grouped_data(radius=i, year=year) for i in display}

    # do_zctas(dbs)

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


if __name__ == "__main__":
    main()
