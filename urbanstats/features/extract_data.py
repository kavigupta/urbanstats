from census_blocks import load_raw_census
from .feature import features
from .within_distance import (
    features_within_distance_by_block,
    minimum_distance_by_block,
)


def feature_data():
    _, pop, _, _, _ = load_raw_census()
    assert pop.shape[1] == 1
    pop = pop[:, 0]
    result = {}
    for feature in features.values():
        result[feature.within_distance_column_name()[0]] = (
            features_within_distance_by_block(feature) != 0
        ) * pop
        result[feature.shortest_distance_column_name()[0]] = (
            minimum_distance_by_block(feature)
        ) * pop
    return result
