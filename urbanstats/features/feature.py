import attr
import geopandas as gpd
import pandas as pd

from .within_distance import shapefile_points_to_radius


@attr.s
class Feature:
    hash_key = attr.ib()
    name = attr.ib()
    radius_km = attr.ib()
    load_fn = attr.ib()

    def load_as_shapefile(self):
        return shapefile_points_to_radius(self.radius_km, self.load_fn())

    def within_distance_column_name(self):
        return (
            f"within_{self.name}_{self.radius_km}",
            f"Within {self.radius_km}km of {self.name} %",
        )

    def shortest_distance_column_name(self):
        return f"mean_dist_{self.name}_updated", f"Mean distance to nearest {self.name}"

    def column_names(self):
        return [
            self.within_distance_column_name(),
            self.shortest_distance_column_name(),
        ]


def load_hospitals():
    loc = "named_region_shapefiles/features/hospitals.zip"
    file = pd.read_csv(loc)
    file = gpd.GeoDataFrame(
        geometry=gpd.points_from_xy(file.X, file.Y), crs="epsg:4326"
    )
    return file


def load_airports():
    loc = "named_region_shapefiles/features/airports.zip"
    file = gpd.read_file(loc)
    file = file[
        (file["type"] == "large_airport")
        | (file["type"] == "medium_airport") & (file.scheduled_ == "yes")
    ]
    return file[["geometry"]]


def load_buses():
    from ..osm.buses import national_stops

    s = national_stops().copy()
    s.geometry = s.geometry.centroid
    s = s[~s.geometry.is_empty]
    s = s.set_crs("epsg:4326")
    # s = s[["geometry"]]
    return s


def load_schools():
    f = gpd.read_file("named_region_shapefiles/features/Public_Schools.zip")
    return f[["geometry"]].to_crs("epsg:4326")


def load_superfund_sites():
    data = pd.read_excel(
        "named_region_shapefiles/features/epa-national-priorities-list-ciesin-mod-v2-2014.xls",
        sheet_name="EPA_NPL_Sites_asof_27Feb2014",
    )
    data = data[data.NPL_STATUS == "Currently on the Final NPL"].copy()
    data["geometry"] = gpd.points_from_xy(data.LONGITUDE, data.LATITUDE)
    data = gpd.GeoDataFrame(data)
    data = data.set_crs("epsg:4326")
    return data[["geometry"]]


features = dict(
    hospitals=Feature(
        hash_key="hospitals",
        name="Hospital",
        radius_km=10,
        load_fn=load_hospitals,
    ),
    schools=Feature(
        hash_key="schools",
        name="Public School",
        radius_km=2,
        load_fn=load_schools,
    ),
    airports=Feature(
        hash_key="airports_3",
        name="Airport",
        radius_km=30,
        load_fn=load_airports,
    ),
    superfund_sites=Feature(
        hash_key="superfund_sites",
        name="Active Superfund Site",
        radius_km=10,
        load_fn=load_superfund_sites,
    ),
)

feature_columns = {
    column_name: name
    for feature in features.values()
    for column_name, name in feature.column_names()
}
