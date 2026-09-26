import numpy as np

EARTH_RADIUS_M = 6_371_000


def _sum_by_group(group, vectors, num_groups):
    return np.stack(
        [
            np.bincount(group, weights=vectors[:, c], minlength=num_groups)
            for c in range(vectors.shape[1])
        ],
        axis=1,
    )


def _weighted_unit_vectors(group, lat, lon, weights):
    keep = weights > 0
    lat_r, lon_r = np.radians(lat[keep]), np.radians(lon[keep])
    points = np.stack(
        [np.cos(lat_r) * np.cos(lon_r), np.cos(lat_r) * np.sin(lon_r), np.sin(lat_r)],
        axis=1,
    )
    return group[keep], points, np.asarray(weights[keep], dtype=np.float64)


def geometric_median_by_group(group, lat, lon, weights, num_groups, **kwargs):
    """
    The point minimizing the weighted sum of great circle distances to each group's points, as
    (lat, lon) arrays indexed by group. NaN for groups with no weight.
    """
    return geometric_median_of_chunks(
        lambda: [(group, lat, lon, weights)], num_groups, **kwargs
    )


def geometric_median_of_chunks(
    chunks, num_groups, *, tolerance_m=10, max_iterations=1000
):
    """
    As geometric_median_by_group, for the points in the (group, lat, lon, weights) chunks that
    chunks() yields. It is called again on every iteration, so only one chunk is in memory at a time.

    Weiszfeld's algorithm on the sphere, where log_x(p) points from x toward p with length d(x, p):

        x <- exp_x( sum_i w_i log_x(p_i) / d_i  /  sum_i w_i / d_i )
    """
    # pylint: disable=too-many-locals
    total = np.zeros(num_groups)
    estimate = np.zeros((num_groups, 3))
    some_point = np.zeros((num_groups, 3))
    for chunk in chunks():
        group, points, weights = _weighted_unit_vectors(*chunk)
        total += np.bincount(group, weights=weights, minlength=num_groups)
        estimate += _sum_by_group(group, points * weights[:, None], num_groups)
        some_point[group] = points
    has_weight = total > 0
    norm = np.linalg.norm(estimate, axis=1)
    # the mean direction is undefined when the points cancel out, so start at one of them
    degenerate = has_weight & (norm < 1e-12)
    estimate[degenerate] = some_point[degenerate]
    norm[degenerate] = 1
    estimate[has_weight] /= norm[has_weight, None]

    active = has_weight.copy()
    for _ in range(max_iterations):
        if not active.any():
            break
        numerator = np.zeros((num_groups, 3))
        denominator = np.zeros(num_groups)
        for chunk in chunks():
            group, points, weights = _weighted_unit_vectors(*chunk)
            in_active = active[group]
            g, p, w = group[in_active], points[in_active], weights[in_active]
            x = estimate[g]
            sin_d = np.linalg.norm(np.cross(x, p), axis=1)
            cos_d = np.einsum("ij,ij->i", x, p)
            d = np.arctan2(sin_d, cos_d)
            # a point at the estimate pulls in no direction, but still holds the estimate in place
            far = sin_d > 1e-15
            direction = np.zeros_like(p)
            direction[far] = (p[far] - cos_d[far, None] * x[far]) / sin_d[far, None]
            numerator += _sum_by_group(g, direction * w[:, None], num_groups)
            denominator += np.bincount(
                g, weights=w / np.maximum(d, 1e-15), minlength=num_groups
            )
        step = np.zeros_like(estimate)
        step[active] = numerator[active] / denominator[active, None]
        theta = np.linalg.norm(step, axis=1)
        moving = active & (theta > 0)
        estimate[moving] = (
            np.cos(theta[moving, None]) * estimate[moving]
            + np.sin(theta[moving, None]) * step[moving] / theta[moving, None]
        )
        estimate[moving] /= np.linalg.norm(estimate[moving], axis=1)[:, None]
        active &= theta * EARTH_RADIUS_M > tolerance_m

    result_lat = np.degrees(np.arcsin(np.clip(estimate[:, 2], -1, 1)))
    result_lon = np.degrees(np.arctan2(estimate[:, 1], estimate[:, 0]))
    result_lat[~has_weight] = np.nan
    result_lon[~has_weight] = np.nan
    return result_lat, result_lon
