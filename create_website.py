import pandas as pd
from shapefiles import shapefiles
from output_geometry import produce_all_geometry_json
from stats_for_shapefile import compute_statistics_for_shapefile
from produce_html_page import add_ordinals


folder = "/home/kavi/temp/webpages"


def full_shapefile():
    full = [compute_statistics_for_shapefile(shapefiles[k]) for k in shapefiles]
    full = pd.concat(full)
    full = full[full.population > 0].copy()
    full = pd.concat(
        [add_ordinals(full[full.type == x]) for x in sorted(set(full.type))]
    )
    full = full.sort_values("population")[::-1]
    return full


def main():
    full = full_shapefile()
    long_to_short = dict(zip(full.longname, full.shortname))

    produce_all_geometry_json(folder, set(long_to_short))


if __name__ == "__main__":
    main()
