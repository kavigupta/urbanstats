from collections import defaultdict

import numpy as np
import tqdm.auto as tqdm
from permacache import permacache, stable_hash

from urbanstats.geometry.categorize_coordinates import categorize


class Ellipse:
    def __init__(self, radius_in_km, latitude, longitude):
        """
        dy = r_earth * dtheta = r_earth * pi/180 dlat
        dlat = dy/r_earth * 180/pi

        dx = r_earth * cos (lat * pi / 180) * dtheta
        dlon = (dx / (r_earth cos (lat * pi/180))) * 180/pi
        """
        radius_earth_km = 6371
        self.lat_radius = radius_in_km / radius_earth_km * 180 / np.pi
        self.lon_radius = (
            radius_in_km
            / (radius_earth_km * np.cos(latitude * np.pi / 180))
            * 180
            / np.pi
        )
        self.latitude = latitude
        self.longitude = longitude

    def relevant_blocks(self):
        bounding_box = np.array(
            [
                self.latitude - self.lat_radius,
                self.latitude + self.lat_radius,
                self.longitude - self.lon_radius,
                self.longitude + self.lon_radius,
            ]
        )
        bounding_box = categorize(bounding_box)
        mi_lat, ma_lat, mi_lon, ma_lon = bounding_box
        return [
            (la, lo)
            for la in range(mi_lat, ma_lat + 1)
            for lo in range(mi_lon, ma_lon + 1)
        ]

    def apply_to_coordinates(self, items):
        indices = items["indices"]
        la, lo = items["coordinates"].T
        mask = ((la - self.latitude) / self.lat_radius) ** 2 + (
            (lo - self.longitude) / self.lon_radius
        ) ** 2 < 1
        return indices[mask]

    def find_neighbors(self, categorization):
        return np.concatenate(
            [
                self.apply_to_coordinates(categorization[block])
                for block in self.relevant_blocks()
                if block in categorization
            ]
        )


@permacache(
    "population_density/geometry/locate_blocks_2",
    key_function=dict(
        coordinates=stable_hash,
        population=stable_hash,
    ),
    multiprocess_safe=True,
)
def locate_blocks(*, coordinates, population, radius=1):
    categories = categorize(coordinates)
    result = defaultdict(list)
    for i in tqdm.trange(coordinates.shape[0], desc=f"Categorizing {radius}km"):
        result[tuple(categories[i])].append(i)
    result = {
        cat: dict(indices=np.array(res), coordinates=coordinates[np.array(res)])
        for cat, res in tqdm.tqdm(
            result.items(), desc=f"Reorganizing categories {radius}km"
        )
    }
    return np.array(
        [
            population[Ellipse(radius, *coord).find_neighbors(result)].sum(0)
            for coord in tqdm.tqdm(
                coordinates, desc=f"Computing population of neighbors {radius}km"
            )
        ]
    )


def compute_density_for_radius(radius, population, coordinates):
    return locate_blocks(
        coordinates=coordinates, population=population, radius=radius
    ) / (np.pi * radius**2)
