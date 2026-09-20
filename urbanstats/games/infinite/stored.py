import json
import os
from functools import lru_cache
from typing import Any, Dict, List, Tuple

import numpy as np

from urbanstats.games.fit_distribution.distribution import QuizQuestionPossibilities
from urbanstats.games.fit_distribution.questions import ValidQuizQuestions
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import read_gzip
from urbanstats.statistics.output_statistics_metadata import (
    statistic_internal_to_display_name,
)
from urbanstats.statistics.stat_path import get_statistic_column_path
from urbanstats.utils import DiscreteDistribution

stored_folder = "stored_quizzes/quiz_sampling_info"

# Bumped by hand: a data refresh keeps the current version and stops regenerating its
# stored data, so only a change to the questions themselves warrants a new one.
juxta_version = 17


@lru_cache(maxsize=None)
def stored_quiz_question_distribution(
    version: int,
) -> Tuple[np.ndarray, QuizQuestionPossibilities, List[DiscreteDistribution]]:
    """
    The frozen questions the infinite quiz is served from, in the same shape as
    compute_quiz_question_distribution: values indexed [geography, stat].
    """
    with open(f"{stored_folder}/{version}.json", "r") as f_info:
        info = json.load(f_info)
    by_number = [read_question(d) for d in info["questionDistribution"]]
    qqp = QuizQuestionPossibilities(
        questions_by_number=[questions for questions, _ in by_number],
        all_geographies=info["allGeographies"],
        all_stats=[internal_statistic_name()[path] for path in info["statPaths"]],
    )
    ps = [DiscreteDistribution.of(p) for _, p in by_number]
    return stored_values(version), qqp, ps


def read_question(
    descriptors: List[Dict[str, Any]],
) -> Tuple[ValidQuizQuestions, np.ndarray]:
    questions, ps = [], []
    for descriptor in descriptors:
        tronche = read_gzip(
            data_files_pb2.QuizQuestionTronche(),
            os.path.join("stored_quizzes", descriptor["path"]),
        )
        questions.append(
            ValidQuizQuestions(
                geography_index_a=np.array(tronche.geography_a),
                geography_index_b=np.array(tronche.geography_b),
                stat_indices=np.array(tronche.stat),
            )
        )
        p = np.exp(
            -(
                np.array(tronche.neg_log_prob_x10_minus_basis)
                + tronche.neg_log_prob_x10_basis
            )
            / 10
        )
        ps.append(p / p.sum() * descriptor["totalP"])
    return ValidQuizQuestions.join(questions), np.concatenate(ps)


def stored_values(version: int) -> np.ndarray:
    data = read_gzip(
        data_files_pb2.QuizFullData(), f"{stored_folder}/{version}/data.gz"
    )
    return np.array([list(stat.stats) for stat in data.stats]).T


@lru_cache(maxsize=None)
def internal_statistic_name() -> Dict[str, Any]:
    """Statistic paths are stored rather than the internal names they are derived from."""
    return {
        get_statistic_column_path(name): name
        for name in statistic_internal_to_display_name()
    }
