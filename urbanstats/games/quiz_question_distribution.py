from dataclasses import dataclass
import numpy as np
from scipy.sparse import coo_matrix

from urbanstats.games.quiz import difficulty_multiplier, ranges


MAX_PCT_DIFF = 500


@dataclass
class ValidQuizQuestions:
    """
    Contains indices of valid quiz questions.
    """

    geography_index_a: np.ndarray
    geography_index_b: np.ndarray
    stat_indices: np.ndarray

    @classmethod
    def join(cls, items):
        return cls(
            geography_index_a=np.concatenate([x.geography_index_a for x in items]),
            geography_index_b=np.concatenate([x.geography_index_b for x in items]),
            stat_indices=np.concatenate([x.stat_indices for x in items]),
        )

    def __len__(self):
        return len(self.stat_indices)


def compute_adjusted_difficulties(typ, stats):
    values = np.array(stats).T
    columns = list(stats.columns)
    vals_a, vals_b = values[:, None], values[:, :, None]
    raw_pct_diff = (
        np.abs(vals_a - vals_b) / np.minimum(np.abs(vals_a), np.abs(vals_b)) * 100
    )
    # TODO handle universe overlaps
    raw_pct_diff[raw_pct_diff > MAX_PCT_DIFF] = np.inf
    diffmults = np.array([difficulty_multiplier(stat_col, typ) for stat_col in columns])
    adj_pct_diff = raw_pct_diff / diffmults[:, None, None]
    return adj_pct_diff


def each_question(typ, stats, stat_to_index, geo_to_index):
    remap_stats = np.array([stat_to_index[stat] for stat in stats])
    remap_geos = np.array([geo_to_index[geo] for geo in stats.index])
    adj_difficulties = compute_adjusted_difficulties(typ, stats)
    results = []
    for lo, hi in ranges:
        mask = (adj_difficulties >= lo) & (adj_difficulties < hi)
        stat_indices, a_indices, b_indices = np.where(mask)
        a_lt_b_mask = a_indices < b_indices
        stat_indices = stat_indices[a_lt_b_mask]
        a_indices, b_indices = a_indices[a_lt_b_mask], b_indices[a_lt_b_mask]
        results.append(
            ValidQuizQuestions(
                geography_index_a=remap_geos[a_indices],
                geography_index_b=remap_geos[b_indices],
                stat_indices=remap_stats[stat_indices],
            )
        )
    return results


def question_index_constraint(questions_by_number, question_weights, num_geos):
    const = 0
    for q, qw in zip(questions_by_number, question_weights):
        matrs = [
            coo_matrix(
                (np.ones(len(q)), (idxs, np.arange(len(q)))), shape=(num_geos, len(q))
            )
            for idxs in (q.geography_index_a, q.geography_index_b)
        ]
        const += (matrs[0] + matrs[1]) / 2 @ qw
    return const == len(questions_by_number) / num_geos


def statistics_constraint(questions_by_number, question_weights, num_stats):
    const = 0
    for q, qw in zip(questions_by_number, question_weights):
        matr = coo_matrix(
            (np.ones(len(q)), (q.stat_indices, np.arange(len(q)))),
            shape=(num_stats, len(q)),
        )
        const += matr @ qw
    return const == len(questions_by_number) / num_stats


def marginal_geography_probability(
    probability_array, normalization_ranges, questions_by_number, num_geos
):
    by_geo = np.zeros(num_geos)
    for idx, q in enumerate(questions_by_number):
        np.add.at(
            by_geo, q.geography_index_a, probability_array[normalization_ranges[idx]]
        )
        np.add.at(
            by_geo, q.geography_index_b, probability_array[normalization_ranges[idx]]
        )
    by_geo /= 2 * len(questions_by_number)
    return by_geo


def renormalize_by_geo(
    probability_array, normalization_ranges, questions_by_number, geo_target
):
    by_geo = marginal_geography_probability(
        probability_array, normalization_ranges, questions_by_number, len(geo_target)
    )
    renormalizers = geo_target / (by_geo + 1e-5)
    for idx, q in enumerate(questions_by_number):
        probability_array[normalization_ranges[idx]] *= (
            renormalizers[q.geography_index_a] + renormalizers[q.geography_index_b]
        ) / 2
    return renormalizers


def marginal_stat_probability(
    probability_array, normalization_ranges, questions_by_number, num_stats
):
    by_stat = np.zeros(num_stats)
    for idx, q in enumerate(questions_by_number):
        np.add.at(by_stat, q.stat_indices, probability_array[normalization_ranges[idx]])
    by_stat /= len(questions_by_number)
    return by_stat


def renormalize_by_stat(
    probability_array, normalization_ranges, questions_by_number, stat_target
):
    by_stat = marginal_stat_probability(
        probability_array, normalization_ranges, questions_by_number, len(stat_target)
    )
    renormalizers = stat_target / (by_stat + 1e-5)
    for idx, q in enumerate(questions_by_number):
        probability_array[normalization_ranges[idx]] *= renormalizers[q.stat_indices]
    return renormalizers


def mean_abs_geo(renormalizers):
    return np.abs(np.log(renormalizers)).mean()
