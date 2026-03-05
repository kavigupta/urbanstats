from collections import defaultdict
from typing import Any

import numpy as np
import tqdm.auto as tqdm
from numpy.typing import NDArray
from permacache import permacache, stable_hash

from urbanstats.geometry.categorize_coordinates import categorize


class Ellipse:
    def __init__(self, radius_in_km: float, latitude: float, longitude: float) -> None:
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

    def relevant_blocks(self) -> list[tuple[int, int]]:
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

    def apply_to_coordinates(self, items: dict[str, Any]) -> np.ndarray[Any, Any]:
        indices = items["indices"]
        la, lo = items["coordinates"].T
        mask = ((la - self.latitude) / self.lat_radius) ** 2 + (
            (lo - self.longitude) / self.lon_radius
        ) ** 2 < 1
        return np.asarray(indices[mask])

    def find_neighbors(
        self, categorization: dict[tuple[int, int], dict[str, Any]]
    ) -> np.ndarray[Any, Any]:
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
def locate_blocks(
    *,
    coordinates: NDArray[Any],
    population: NDArray[Any],
    radius: float = 1,
) -> NDArray[Any]:
    categories = categorize(coordinates)
    result_list: defaultdict[tuple[int, ...], list[int]] = defaultdict(list)
    for i in tqdm.trange(coordinates.shape[0], desc=f"Categorizing {radius}km"):
        result_list[tuple(categories[i])].append(i)
    result_dict: dict[tuple[int, int], dict[str, Any]] = {
        cat: dict(indices=np.array(res), coordinates=coordinates[np.array(res)])
        for cat, res in tqdm.tqdm(
            result_list.items(), desc=f"Reorganizing categories {radius}km"
        )
    }
    out: NDArray[Any] = np.array(
        [
            population[Ellipse(radius, *coord).find_neighbors(result_dict)].sum(0)
            for coord in tqdm.tqdm(
                coordinates, desc=f"Computing population of neighbors {radius}km"
            )
        ]
    )
    return out


def compute_density_for_radius(
    radius: float,
    population: NDArray[Any],
    coordinates: NDArray[Any],
) -> NDArray[Any]:
    return locate_blocks(
        coordinates=coordinates, population=population, radius=radius
    ) / (np.pi * radius**2)
