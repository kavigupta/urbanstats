from functools import lru_cache

import numpy as np
import pandas as pd

from urbanstats.games.quiz_question_distribution import MIN_POP, MIN_POP_INTERNATIONAL
from urbanstats.utils import DiscreteDistribution
from urbanstats.website_data.table import shapefile_without_ordinals

from .quiz_question_distribution import collections_index, produce_quiz_question_weights
from .quiz_regions import region_map


@lru_cache()
def compute_quiz_question_distribution():
    geographies_by_type = compute_geographies_by_type()
    lookup_table = pd.concat([x.data for x in geographies_by_type.values()])
    prob_res = produce_quiz_question_weights(geographies_by_type)
    qqp = prob_res["qqp"]
    sorted_index = lookup_table.loc[qqp.all_geographies]
    data = np.array([sorted_index[c] for c in qqp.all_stats]).T
    ps = [DiscreteDistribution.of(pi) for pi in prob_res["ps"]]
    return data, qqp, ps


def compute_geographies_by_type():
    t = shapefile_without_ordinals().copy()
    t["local_region_mask"] = t.universes.apply(lambda x: "Canada" in x or "USA" in x)
    filtered_for_pop = t[
        t.best_population_estimate
        > t.local_region_mask.apply(lambda x: MIN_POP if x else MIN_POP_INTERNATIONAL)
    ]
    geographies_by_type = {
        k: r.load_quiz_table(filtered_for_pop) for k, r in region_map.items()
    }

    return geographies_by_type


def sample_quiz_indices(rng):
    _, qqp, ps = compute_quiz_question_distribution()
    while True:
        indices = np.array([pi.sample(rng, 10) for pi in ps])
        stat_indices = np.array(
            [q.stat_indices[i] for q, i in zip(qqp.questions_by_number, indices)]
        )
        for i, x in enumerate(collections_index(qqp)[stat_indices].T):
            if len(set(x)) == len(x):
                return indices[:, i]


def sample_quiz(seed):
    data, qqp, _ = compute_quiz_question_distribution()
    rng = np.random.RandomState(seed)
    indices = sample_quiz_indices(rng)
    quiz = []
    for qs, idx in zip(qqp.questions_by_number, indices):
        q = qs[idx]
        a, b = (
            qqp.all_geographies[q.geography_index_a],
            qqp.all_geographies[q.geography_index_b],
        )
        if rng.rand() < 0.5:
            a, b = b, a
        s = qqp.all_stats[q.stat_indices]
        stat_a, stat_b = data[
            [q.geography_index_a, q.geography_index_b], q.stat_indices
        ]
        quiz.append(
            dict(
                stat_column_original=s,
                longname_a=a,
                longname_b=b,
                stat_a=stat_a,
                stat_b=stat_b,
            )
        )
    return quiz
