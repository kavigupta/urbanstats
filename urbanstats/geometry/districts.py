from collections import defaultdict


def consistent_district_padding(states, districts, *, minimum_length=0):
    """
    Produce consistent padding for names of districts within a state. Padding is only ever 0s added to the left, and is
    consistent if the length of the numerical portion on the left is the same for all districts in the state. E.g.,
    01, 02, 03a, 03b, and 04 are consistent, but 01, 02, 03a, 03b, and 4 are not.
    """
    districts = list(districts)
    state_to_indices = defaultdict(list)
    for i, state in enumerate(states):
        state_to_indices[state].append(i)
    for state, indices in state_to_indices.items():
        districts_for_state = [districts[i].lstrip("0") for i in indices]
        districts_for_state = make_consistent_padding(
            districts_for_state, minimum_length=minimum_length
        )
        for i, district in zip(indices, districts_for_state):
            districts[i] = district
    return districts


def make_consistent_padding(districts, *, minimum_length):
    numeric_lengths = [compute_numeric_length(district) for district in districts]
    max_numeric_length = max(max(numeric_lengths), minimum_length)
    return [
        "0" * (max_numeric_length - numeric_length) + district
        for district, numeric_length in zip(districts, numeric_lengths)
    ]


def compute_numeric_length(district):
    for i, c in enumerate(district):
        if not c.isdigit():
            return i
    return len(district)
