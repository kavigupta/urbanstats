import os
import numpy as np
from permacache import permacache, stable_hash
import tqdm.auto as tqdm

from urbanstats.games.quiz_question_distribution import quiz_question_weights
from urbanstats.games.quiz_sampling import (
    compute_geographies_by_type,
    compute_quiz_question_distribution,
)
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip

tronche_size = 100_000


@permacache(
    "urbanstats/games/infinite/data/output_tronche_6",
    key_function=dict(tronche_vqq=stable_hash, tronche_p=stable_hash),
    out_file=["tronche_path"],
)
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


def output_quiz_question(q, p, question_folder):
    idxs = np.argsort(-p)
    tronche_descriptors = []
    for idx, start in tqdm.tqdm(
        list(enumerate(range(0, p.shape[0], tronche_size))),
        desc=f"Generating {os.path.basename(question_folder)}",
    ):
        path = f"{idx}.gz"
        i = idxs[start : start + tronche_size]
        tronche, tronche_p = q[i], p[i]
        total_p = output_tronche(
            tronche, tronche_p, os.path.join(question_folder, path)
        )
        tronche_descriptors.append({"path": path, "total_p": float(total_p)})
    return tronche_descriptors


def output_quiz_sampling_info(folder):
    qqw = quiz_question_weights(compute_geographies_by_type())
    data, *_ = compute_quiz_question_distribution()
    ps = qqw["ps"]
    qqp = qqw["qqp"]
    descriptors = []
    for i, (q, p) in enumerate(zip(qqp.questions_by_number, ps), start=1):
        descriptors.append(output_quiz_question(q, p, os.path.join(folder, f"q{i}")))

    qfd = data_files_pb2.QuizFullData()
    qfd.stats.extend(data.flatten())
    write_gzip(qfd, os.path.join(folder, "data.gz"))
    return descriptors
