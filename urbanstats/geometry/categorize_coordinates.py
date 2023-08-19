import numpy as np

GRANULARITY = 0.05


def categorize(coordinates):
    return (coordinates // GRANULARITY).astype(np.int)
