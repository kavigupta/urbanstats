from census_blocks import load_raw_census
from .feature import features
from .within_distance import features_within_distance_by_block


def feature_data():
    _, pop, _, _, _ = load_raw_census()
    assert pop.shape[1] == 1
    pop = pop[:, 0]
    return {
        feature.column_name(): (features_within_distance_by_block(feature) != 0) * pop
        for feature in features.values()
    }
