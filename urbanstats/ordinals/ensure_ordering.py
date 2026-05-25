import numpy as np


def check_ordering_pair(prev_val, val_unmodified, val_modified, tol=1e-3):
    assert isinstance(prev_val, np.float32)
    assert isinstance(val_unmodified, np.float32)
    assert isinstance(val_modified, np.float32)
    if not np.isfinite(prev_val) or not np.isfinite(val_unmodified):
        return
    if not (val_modified < prev_val):
        raise ValueError(
            f"Modified value {val_modified} is not less than previous value {prev_val}"
        )
    if not np.isclose(val_unmodified, val_modified, rtol=tol, atol=tol):
        raise ValueError(
            f"Modified value {val_modified} is not close enough to original value {val_unmodified}"
        )


def check_ordering(values, ordering):
    for i in range(1, len(values)):
        index = ordering[i]
        prev_index = ordering[i - 1]
        check_ordering_pair(values[prev_index], values[index], values[index])


def ensure_correct_ordering(values, ordering):
    """
    We want to ensure that the values are strictly decreasing according to the ordering.
    We break ties by using np.nextafter to get the next representable float value that is less than the previous value.

    The resulting list guarantees that for all initially finite values, if ordering[i] > ordering[j], then values[i] < values[j],
    and the values are within a small tolerance of the original values
    """
    values = np.array(values, dtype=np.float32, copy=True)
    ordering = np.array(ordering, dtype=np.int64, copy=False)
    assert len(values) == len(ordering)
    ordering = np.argsort(np.argsort(ordering))
    for i in reversed(range(0, len(values) - 1)):
        index = ordering[i]
        next_index = ordering[i + 1]
        if values[index] <= values[next_index]:
            next_value = values[next_index]
            new_value = np.nextafter(next_value, np.float32(np.inf))
            values[index] = new_value
    check_ordering(values, ordering)
    return values.tolist()
