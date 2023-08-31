import attr
import pandas as pd
import geopandas as gpd

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


features = dict(
    hospitals=Feature(
        hash_key="hospitals",
        name="Hospital",
        radius_km=10,
        load_fn=load_hospitals,
    ),
)

feature_columns = {
    column_name: name
    for feature in features.values()
    for column_name, name in feature.column_names()
}
