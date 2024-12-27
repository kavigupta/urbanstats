from dataclasses import dataclass
from functools import cached_property
from typing import List

import numpy as np
import torch
import tqdm.auto as tqdm
from permacache import permacache, stable_hash

from .questions import ValidQuizQuestions, classify_questions


@dataclass
class QuizQuestionPossibilities:
    questions_by_number: List[ValidQuizQuestions]
    all_geographies: List[str]
    all_stats: List[str]

    def aggregate(self, ps):
        ps = [torch.tensor(p, dtype=torch.float32) for p in ps]
        # p = torch.tensor(np.log(np.concatenate(ps)), dtype=torch.float32)
        return [x.numpy() for x in self._aggregate_torch(ps)]

    def probabilities_each(self, p):
        p = torch.tensor(p, dtype=torch.float32)
        return [x.numpy() for x in self._probabilities_each_torch(p)]

    def _aggregate_torch(self, ps):
        g = torch.zeros(len(self.all_geographies))
        for q, p_q in zip(self.questions_by_number, ps):
            g.index_add_(0, torch.tensor(q.geography_index_a), p_q)
            g.index_add_(0, torch.tensor(q.geography_index_b), p_q)
        g = g / len(self.questions_by_number) / 2
        s = torch.zeros(len(self.all_stats))
        for q, p_q in zip(self.questions_by_number, ps):
            s.index_add_(0, torch.tensor(q.stat_indices), p_q)
        s = s / len(self.questions_by_number)
        return g, s

    def _probabilities_each_torch(self, p):
        ps = [torch.softmax(p[rang], axis=0) for rang in self.normalization_ranges]
        return ps

    def delta(self, p, q):
        return (p * (torch.log(p) - torch.log(q))).sum()

    def h(self, p):
        hactual = (-p * torch.log(p)).sum()
        huniform = np.log(len(p))
        return huniform - hactual

    def train(self, geo_target, stat_target, weight_h=0.1, weight_s=10):
        g_target = torch.tensor(geo_target, dtype=torch.float32)
        s_target = torch.tensor(stat_target, dtype=torch.float32)
        p = torch.ones(len(self), requires_grad=True, dtype=torch.float32)
        opt = torch.optim.Adam([p], lr=0.5)
        prev = float("inf")
        for idx in range(1000):
            ps = self._probabilities_each_torch(p)
            g, s = self._aggregate_torch(ps)
            loss = (
                weight_s * self.delta(s_target, s)
                + self.delta(g_target, g)
                + weight_h * sum(self.h(pi) for pi in ps) / len(ps)
            )
            if idx % 10 == 0:
                print(idx, loss.item())
                if (loss.item() - prev) / prev > -0.01:
                    break
                prev = loss.item()
            opt.zero_grad()
            loss.backward()
            opt.step()
        ps = self._probabilities_each_torch(p)
        return [x.detach().numpy() for x in ps]

    @cached_property
    def normalization_ranges(self):
        res = []
        start = 0
        for q in self.questions_by_number:
            res.append(slice(start, start + len(q)))
            start += len(q)
        return res

    def __len__(self):
        return sum(len(q) for q in self.questions_by_number)


@permacache(
    "urbanstats/games/fit_distribution/compute_quiz_question_possibilities",
    key_function=dict(
        tables_by_type=stable_hash,
    ),
)
def _compute_quiz_question_possibilities(
    tables_by_type,
    *,
    col_to_difficulty,
    intl_difficulty,
    diff_ranges,
    excluded_universes,
):
    all_stats = sorted({s for qt in tables_by_type.values() for s in qt.data}, key=str)
    all_geographies = sorted(
        {s for qt in tables_by_type.values() for s in qt.data.index}, key=str
    )
    stat_to_index = {k: i for i, k in enumerate(all_stats)}
    geo_to_index = {k: i for i, k in enumerate(all_geographies)}
    questions = []
    for typ in tqdm.tqdm(tables_by_type):
        qt = tables_by_type[typ]
        questions.append(
            classify_questions(
                qt,
                stat_to_index,
                geo_to_index,
                col_to_difficulty=col_to_difficulty,
                intl_difficulty=intl_difficulty,
                diff_ranges=diff_ranges,
                excluded_universes=excluded_universes,
            )
        )
    questions_by_number = [ValidQuizQuestions.join(x) for x in zip(*questions)]
    return QuizQuestionPossibilities(
        questions_by_number=questions_by_number,
        all_geographies=all_geographies,
        all_stats=all_stats,
    )


def train_quiz_question_weights(
    tables_by_type,
    *,
    col_to_difficulty,
    intl_difficulty,
    diff_ranges,
    compute_geo_target,
    compute_stat_target,
    excluded_universes,
):
    qqp = _compute_quiz_question_possibilities(
        tables_by_type,
        col_to_difficulty=col_to_difficulty,
        intl_difficulty=intl_difficulty,
        diff_ranges=diff_ranges,
        excluded_universes=excluded_universes,
    )
    geo_target = compute_geo_target(qqp, tables_by_type)
    stat_target = compute_stat_target(qqp, tables_by_type)
    return _train_quiz_question_weights_cached(
        tables_by_type,
        geo_target,
        stat_target,
        col_to_difficulty=col_to_difficulty,
        intl_difficulty=intl_difficulty,
        diff_ranges=diff_ranges,
        excluded_universes=excluded_universes,
    )


@permacache(
    "urbanstats/games/fit_distribution/distribution/_train_quiz_question_weights_cached",
    key_function=dict(
        tables_by_type=stable_hash, geo_target=stable_hash, stat_target=stable_hash
    ),
)
def _train_quiz_question_weights_cached(
    tables_by_type,
    geo_target,
    stat_target,
    *,
    col_to_difficulty,
    intl_difficulty,
    diff_ranges,
    excluded_universes,
):
    qqp = _compute_quiz_question_possibilities(
        tables_by_type,
        col_to_difficulty=col_to_difficulty,
        intl_difficulty=intl_difficulty,
        diff_ranges=diff_ranges,
        excluded_universes=excluded_universes,
    )
    ps = qqp.train(geo_target, stat_target)
    return dict(ps=ps, geo_target=geo_target, stat_target=stat_target, qqp=qqp)
