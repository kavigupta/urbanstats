from collections import defaultdict
import numpy as np

from permacache import permacache, stable_hash
import tqdm.auto as tqdm
from urbanstats.geometry.categorize_coordinates import categorize

from urbanstats.geometry.ellipse import Ellipse

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
    for i in tqdm.trange(coordinates.shape[0]):
        result[tuple(categories[i])].append(i)
    result = {
        cat: dict(indices=np.array(res), coordinates=coordinates[np.array(res)])
        for cat, res in tqdm.tqdm(result.items())
    }
    return np.array(
        [
            population[Ellipse(radius, *coord).find_neighbors(result, coordinates)].sum(
                0
            )
            for coord in tqdm.tqdm(coordinates)
        ]
    )
