import numpy as np
import numpy.typing as npt

GRANULARITY = 0.05


def categorize(coordinates: npt.NDArray[np.float64]) -> npt.NDArray[np.int64]:
    return (coordinates // GRANULARITY).astype(np.int64)
