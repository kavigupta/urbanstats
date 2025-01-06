import json
import os

import numpy as np
import tqdm.auto as tqdm
from permacache import stable_hash

from urbanstats.games.quiz_question_distribution import quiz_question_weights
from urbanstats.games.quiz_sampling import (
    compute_geographies_by_type,
    compute_quiz_question_distribution,
)
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names
from urbanstats.utils import output_typescript

tronche_size = 100_000
version_info = "juxtastat_version.json"


def output_tronche(tronche_vqq, tronche_p, tronche_path):
    tronche_total_p = tronche_p.sum()
    tronche_p = tronche_p / tronche_total_p
    binned_probs = -(np.log(tronche_p) / 0.01).round().astype(np.int64)
    tronche_proto = data_files_pb2.QuizQuestionTronche()
    tronche_proto.geography_a.extend(tronche_vqq.geography_index_a)
    tronche_proto.geography_b.extend(tronche_vqq.geography_index_b)
    tronche_proto.stat.extend(tronche_vqq.stat_indices)
    tronche_proto.neg_log_prob_x100.extend(binned_probs)
    write_gzip(tronche_proto, tronche_path)
    return tronche_total_p


def output_quiz_question(q, p, site_folder, question_folder):
    idxs = np.argsort(-p)
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


def output_quiz_sampling_info(site_folder, subfolder):
    output_quiz_sampling_data(site_folder, subfolder)
    sampling_info = output_quiz_sampling_probabilities(site_folder, subfolder)
    with open("react/src/data/quiz_infinite.ts", "w") as f:
        output_typescript(sampling_info, f)


def output_quiz_sampling_data(site_folder, subfolder):
    data, *_ = compute_quiz_question_distribution()
    data = data.T
    qfd = data_files_pb2.QuizFullData()
    for row in data:
        q = qfd.stats.add()
        q.stats.extend(row)
    write_gzip(qfd, os.path.join(site_folder, subfolder, "data.gz"))


def output_quiz_sampling_probabilities(site_folder, subfolder):
    ps, qqp = quiz_data()
    hash_value = stable_hash((ps, qqp))
    info = get_juxta_version_info()
    if hash_value not in dict(get_juxta_version_info()):
        info.append((hash_value, len(info)))
        with open(version_info, "w") as f:
            json.dump(info, f)
    juxta_version = dict(info)[hash_value]
    descriptors = []
    for i, (q, p) in enumerate(zip(qqp.questions_by_number, ps), start=1):
        descriptors.append(
            output_quiz_question(q, p, site_folder, os.path.join(subfolder, f"q{i}"))
        )

    return dict(
        allGeographies=qqp.all_geographies,
        allStats=[internal_statistic_names().index(s) for s in qqp.all_stats],
        questionDistribution=descriptors,
        juxtaVersion=juxta_version,
    )


def get_juxta_version_info():
    if not os.path.exists(version_info):
        return []
    with open(version_info, "r") as f:
        return json.load(f)


def quiz_data():
    qqw = quiz_question_weights(compute_geographies_by_type())
    ps = qqw["ps"]
    qqp = qqw["qqp"]
    return ps, qqp
