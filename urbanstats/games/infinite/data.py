import atexit
import json
import os
import shutil
from typing import Any, Dict, List, Tuple

import numpy as np
import tqdm.auto as tqdm
from permacache import stable_hash

from urbanstats.games.fit_distribution.distribution import QuizQuestionPossibilities
from urbanstats.games.fit_distribution.questions import ValidQuizQuestions
from urbanstats.games.infinite.stored import juxta_version
from urbanstats.games.quiz_columns import stat_to_quiz_name
from urbanstats.games.quiz_question_distribution import quiz_question_weights
from urbanstats.games.quiz_sampling import (
    compute_geographies_by_type,
    compute_quiz_question_distribution,
)
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip
from urbanstats.statistics.output_statistics_metadata import (
    statistic_internal_to_display_name,
)
from urbanstats.statistics.stat_path import get_statistic_column_path
from urbanstats.utils import output_typescript

tronche_size = 100_000
version_info = "juxtastat_version.json"


def output_tronche(
    tronche_vqq: ValidQuizQuestions, tronche_p: np.ndarray, tronche_path: str
) -> float:
    tronche_total_p = tronche_p.sum()
    tronche_p = tronche_p / tronche_total_p
    binned_probs = -(np.log(tronche_p) / 0.1).round().astype(np.int64)
    tronche_proto = data_files_pb2.QuizQuestionTronche()
    tronche_proto.geography_a.extend(tronche_vqq.geography_index_a)
    tronche_proto.geography_b.extend(tronche_vqq.geography_index_b)
    tronche_proto.stat.extend(tronche_vqq.stat_indices)
    # vulture: ignore -- not actually creating a field. this is from protobuf
    tronche_proto.neg_log_prob_x10_basis = int(binned_probs.min())
    tronche_proto.neg_log_prob_x10_minus_basis.extend(binned_probs - binned_probs.min())
    write_gzip(tronche_proto, tronche_path)
    return float(tronche_total_p)


def output_quiz_question(
    q: ValidQuizQuestions, p: np.ndarray, site_folder: str, question_folder: str
) -> List[Dict[str, Any]]:
    idxs = compute_order(q)

    tronche_descriptors = []
    for idx, start in tqdm.tqdm(
        list(enumerate(range(0, p.shape[0], tronche_size))),
        desc=f"Generating {question_folder}",
    ):
        path = os.path.join(question_folder, f"{idx}.gz")
        i = idxs[start : start + tronche_size]
        tronche, tronche_p = q[i], p[i]
        total_p = output_tronche(tronche, tronche_p, os.path.join(site_folder, path))
        tronche_descriptors.append({"path": path, "totalP": float(total_p)})
    return tronche_descriptors


def output_quiz_sampling_info(site_folder: str, subfolder: str) -> None:
    if quiz_data_matches_version():
        generate_stored_quiz_sampling_data()
    else:
        report_juxta_version_out_of_date()
    by_version = []
    for version in range(1, juxta_version + 1):
        dest = os.path.join(site_folder, subfolder, str(version))
        shutil.rmtree(dest, ignore_errors=True)
        shutil.copytree(
            f"stored_quizzes/quiz_sampling_info/{version}",
            dest,
        )
        with open(f"stored_quizzes/quiz_sampling_info/{version}.json", "r") as f_json:
            by_version.append(json.load(f_json))
    with open("react/src/data/quiz_infinite.ts", "w") as f_ts:
        output_typescript(by_version, f_ts)


def quiz_sampling_data() -> data_files_pb2.QuizFullData:
    data, *_ = compute_quiz_question_distribution()
    data = data.T
    qfd = data_files_pb2.QuizFullData()
    for row in data:
        q = qfd.stats.add()
        q.stats.extend(row)
    return qfd


def filter_for_prob_over_threshold(
    q: ValidQuizQuestions, p: np.ndarray, *, threshold: float
) -> Tuple[ValidQuizQuestions, np.ndarray]:
    sorted_p = np.sort(p[:])
    [[idx, *_]] = np.where(np.cumsum(sorted_p) > threshold)
    thresh = sorted_p[idx]
    mask = p >= thresh
    q, p = q[mask], p[mask].copy()
    p /= p.sum()
    return q, p


def compute_order(q: ValidQuizQuestions) -> np.ndarray:
    sort_keys = (
        q.stat_indices,
        q.geography_index_a,
        q.geography_index_b,
    )
    basis = 1
    order_value = 0
    for key in sort_keys[::-1]:
        order_value += basis * key
        basis *= key.max() + 1
    idxs = np.argsort(order_value)
    return idxs


def output_quiz_sampling_probabilities_locally() -> None:
    ps, qqp = quiz_data()
    descriptors = []
    for i, (q, p) in enumerate(zip(qqp.questions_by_number, ps), start=1):
        q, p = filter_for_prob_over_threshold(q, p, threshold=0.05)
        descriptors.append(
            output_quiz_question(
                q, p, "stored_quizzes", f"quiz_sampling_info/{juxta_version}/q{i}"
            )
        )

    # internal_indices = [internal_statistic_names().index(s) for s in qqp.all_stats]
    with open(f"stored_quizzes/quiz_sampling_info/{juxta_version}.json", "w") as f_info:
        json.dump(
            dict(
                allGeographies=qqp.all_geographies,
                allStatNames=[
                    statistic_internal_to_display_name()[s] for s in qqp.all_stats
                ],
                statPaths=[get_statistic_column_path(s) for s in qqp.all_stats],
                statQuestionNames=[stat_to_quiz_name()[s] for s in qqp.all_stats],
                questionDistribution=descriptors,
                juxtaVersion=juxta_version,
            ),
            f_info,
        )


def quiz_data_matches_version() -> bool:
    """A version that has just been bumped matches by definition, and records its hash."""
    info = get_juxta_version_info()
    hash_for_version = {version: h for h, version in info}
    if juxta_version in hash_for_version:
        return hash_for_version[juxta_version] == quiz_data_hash()
    assert juxta_version == len(
        info
    ), f"juxta_version goes up one at a time; expected {len(info)}"
    info.append((quiz_data_hash(), juxta_version))
    with open(version_info, "w") as f_ver:
        json.dump(info, f_ver)
    return True


def generate_stored_quiz_sampling_data() -> None:
    output_quiz_sampling_probabilities_locally()
    write_gzip(
        quiz_sampling_data(),
        f"stored_quizzes/quiz_sampling_info/{juxta_version}/data.gz",
    )


def report_juxta_version_out_of_date() -> None:
    warn_juxta_version_out_of_date()
    # the rest of the build buries this, so repeat it once the build is done
    atexit.register(warn_juxta_version_out_of_date)


def quiz_data_hash() -> str:
    ps, qqp = quiz_data()
    return stable_hash((ps, qqp, "v1"))


def warn_juxta_version_out_of_date() -> None:
    banner = "*" * 80
    print(
        f"\n{banner}\n"
        f"WARNING: juxta version {juxta_version} is out of date. The quiz data has\n"
        f"changed since that version was generated, so both the daily and the infinite\n"
        f"quizzes are being built from the stored version {juxta_version} data rather than\n"
        f"from the current data. Bump juxta_version in urbanstats/games/infinite/stored.py\n"
        f"to generate a new version from the current data.\n"
        f"{banner}\n"
    )


def get_juxta_version_info() -> List[Tuple[str, int]]:
    if not os.path.exists(version_info):
        return []
    with open(version_info, "r") as f_ver:
        return json.load(f_ver)


def quiz_data() -> Tuple[List[np.ndarray], QuizQuestionPossibilities]:
    qqw = quiz_question_weights(compute_geographies_by_type())
    ps = qqw["ps"]
    qqp = qqw["qqp"]
    return ps, qqp
