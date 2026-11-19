import unittest

import numpy as np
from scipy.optimize import minimize

from urbanstats.geometry.weighted_statistics import (
    EARTH_RADIUS_M,
    geometric_median_by_group,
    geometric_median_of_chunks,
)


def haversine_m(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, (lat1, lon1, lat2, lon2))
    a = (
        np.sin((lat2 - lat1) / 2) ** 2
        + np.cos(lat1) * np.cos(lat2) * np.sin((lon2 - lon1) / 2) ** 2
    )
    return EARTH_RADIUS_M * 2 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))


def random_points(rng, spread):
    n = rng.integers(2, 60)
    lat = np.clip(rng.uniform(-60, 60) + rng.normal(size=n) * spread, -89, 89)
    lon = (rng.uniform(-180, 180) + rng.normal(size=n) * spread + 180) % 360 - 180
    weights = rng.integers(0, 10, size=n).astype(float)
    weights[0] += 1
    return lat, lon, weights


def single_group(lat, lon, weights, **kwargs):
    [median_lat], [median_lon] = geometric_median_by_group(
        np.zeros(len(lat), dtype=np.int64), lat, lon, weights, 1, **kwargs
    )
    return median_lat, median_lon


class GeometricMedianTest(unittest.TestCase):
    def test_minimizes_total_distance(self):
        rng = np.random.default_rng(0)
        for spread in [0.01, 1, 20]:
            for _ in range(5):
                lat, lon, weights = random_points(rng, spread)
                median = single_group(lat, lon, weights, tolerance_m=1e-3)

                def cost(q, lat=lat, lon=lon, weights=weights):
                    return (weights * haversine_m(q[0], q[1], lat, lon)).sum()

                best = min(
                    (
                        minimize(
                            cost,
                            start,
                            method="Nelder-Mead",
                            options=dict(xatol=1e-10, fatol=1e-6, maxiter=20000),
                        )
                        for start in [median, (lat[0], lon[0])]
                    ),
                    key=lambda r: r.fun,
                )
                self.assertLessEqual(cost(median), best.fun * (1 + 1e-6))

    def test_chunks_match_whole(self):
        rng = np.random.default_rng(1)
        lat, lon, weights = random_points(rng, 1)
        group = rng.integers(0, 3, size=len(lat))
        whole = geometric_median_by_group(group, lat, lon, weights, 4)
        chunked = geometric_median_of_chunks(
            lambda: [
                (group[i : i + 7], lat[i : i + 7], lon[i : i + 7], weights[i : i + 7])
                for i in range(0, len(lat), 7)
            ],
            4,
        )
        np.testing.assert_allclose(whole, chunked, atol=1e-9)

    def test_groups_are_independent(self):
        rng = np.random.default_rng(2)
        parts = [random_points(rng, 1) for _ in range(3)]
        group = np.concatenate([np.full(len(p[0]), i) for i, p in enumerate(parts)])
        together = geometric_median_by_group(
            group, *[np.concatenate(x) for x in zip(*parts)], 3
        )
        for i, part in enumerate(parts):
            np.testing.assert_allclose(
                [together[0][i], together[1][i]], single_group(*part), atol=1e-9
            )

    def test_across_the_antimeridian(self):
        lat = np.array([10.0, 10.0, 11.0])
        lon = np.array([179.9, -179.9, 180.0])
        median_lat, median_lon = single_group(lat, lon, np.ones(3))
        self.assertAlmostEqual(median_lat, 10.0569, places=3)
        self.assertLess(haversine_m(median_lat, median_lon, median_lat, 180), 10)

    def test_majority_point_is_the_median(self):
        lat = np.array([0.0, 5, -5])
        lon = np.array([0.0, 0, 3])
        median = single_group(lat, lon, np.array([10.0, 1, 1]))
        self.assertLess(haversine_m(*median, 0, 0), 10)

    def test_ignores_zero_weights_and_empty_groups(self):
        lat = np.array([0.0, 1, 50])
        lon = np.array([0.0, 1, 50])
        median_lat, median_lon = geometric_median_by_group(
            np.array([0, 0, 0]), lat, lon, np.array([1.0, 1, 0]), 2
        )
        self.assertLess(haversine_m(median_lat[0], median_lon[0], 0.5, 0.5), 80e3)
        self.assertTrue(np.isnan(median_lat[1]) and np.isnan(median_lon[1]))
