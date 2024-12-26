from dataclasses import dataclass
from functools import cached_property
from typing import Counter, List
import numpy as np
import pandas as pd
import torch
import tqdm.auto as tqdm
from permacache import permacache, stable_hash

from urbanstats.games.quiz import difficulty_multiplier
from urbanstats.games.quiz_regions import get_quiz_stats
from urbanstats.universe.universe_list import (
    default_universes,
    universe_by_universe_type,
)


MAX_PCT_DIFF = 500
INTERNATIONAL_DIFFICULTY_MULTIPLIER = 2
RANGES = [
    (200, 500),
    (125, 200),
    (75, 125),
    (40, 75),
    (5, 40),
]


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

    def __getitem__(self, item):
        return ValidQuizQuestions(
            geography_index_a=self.geography_index_a[item],
            geography_index_b=self.geography_index_b[item],
            stat_indices=self.stat_indices[item],
        )


def compute_adjusted_difficulties(qt):
    values = np.array(qt.data).T
    vals_a, vals_b = values[:, None], values[:, :, None]
    raw_pct_diff = (
        np.abs(vals_a - vals_b) / np.minimum(np.abs(vals_a), np.abs(vals_b)) * 100
    )
    raw_pct_diff[raw_pct_diff > MAX_PCT_DIFF] = np.inf
    adj_pct_diff = raw_pct_diff / compute_difficulty_multipliers(qt)
    return adj_pct_diff


def universe_overlap_mask(qt):
    excluded_universes = set(default_universes) | set(
        universe_by_universe_type()["continent"]
    )
    non_default_non_continent_universes = [
        {u for u in us if u not in excluded_universes} for us in qt.universes
    ]
    return np.array(
        [
            [bool(a & b) for a in non_default_non_continent_universes]
            for b in non_default_non_continent_universes
        ]
    )


def compute_difficulty_multipliers(qt):
    diffmults = np.array(
        [difficulty_multiplier(stat_col) for stat_col in list(qt.data.columns)]
    )[:, None, None]
    diffmults = np.repeat(diffmults, len(qt.data), axis=1)
    diffmults = np.repeat(diffmults, len(qt.data), axis=2)
    lrm = qt.local_region_mask
    diffmults[:, ~lrm, :] = INTERNATIONAL_DIFFICULTY_MULTIPLIER
    diffmults[:, :, ~lrm] = INTERNATIONAL_DIFFICULTY_MULTIPLIER
    diffmults[:, universe_overlap_mask(qt)] = 0
    return diffmults


def compute_difficulty(stat_a, stat_b, stat_column_original, a, b):
    diffmult = difficulty_multiplier(stat_column_original)
    if not any(x.endswith("USA") or x.endswith("Canada") for x in (a, b)):
        diffmult = 4
    diff = abs(stat_a - stat_b) / min(abs(stat_a), abs(stat_b)) * 100
    diff = diff / diffmult
    return diff


def each_question(qt, stat_to_index, geo_to_index):
    remap_stats = np.array([stat_to_index[stat] for stat in qt.data])
    remap_geos = np.array([geo_to_index[geo] for geo in qt.data.index])
    adj_difficulties = compute_adjusted_difficulties(qt)
    results = []
    for lo, hi in RANGES:
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


@dataclass
class QuizQuestionPossibilities:
    questions_by_number: List[ValidQuizQuestions]
    all_geographies: List[str]
    all_stats: List[str]

    @classmethod
    def compute_quiz_question_possibilities(cls, tables_by_type):
        all_stats = sorted(
            {s for qt in tables_by_type.values() for s in qt.data}, key=str
        )
        all_geographies = sorted(
            {s for qt in tables_by_type.values() for s in qt.data.index}, key=str
        )
        stat_to_index = {k: i for i, k in enumerate(all_stats)}
        geo_to_index = {k: i for i, k in enumerate(all_geographies)}
        questions = []
        for typ in tqdm.tqdm(tables_by_type):
            qt = tables_by_type[typ]
            questions.append(each_question(qt, stat_to_index, geo_to_index))
        questions_by_number = [ValidQuizQuestions.join(x) for x in zip(*questions)]
        return cls(
            questions_by_number=questions_by_number,
            all_geographies=all_geographies,
            all_stats=all_stats,
        )

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


def compute_geo_target(qqp, geographies_by_type):
    geo_weight = pd.concat(
        [
            qt.weight_internal
            / qt.weight_internal.sum()
            * qt.weight_internal.shape[0] ** 0.5
            for _, qt in geographies_by_type.items()
        ]
    )
    geo_weight /= geo_weight.sum()
    geo_target = np.array(geo_weight.loc[qqp.all_geographies])

    return geo_target


def compute_stat_target(qqp):
    collections = collections_each(qqp)
    count_collections = Counter(collections)
    stat_target = np.array(
        [c.weight_entire_collection / count_collections[c] ** 0.1 for c in collections]
    )
    stat_target /= stat_target.sum()
    return stat_target


def collections_each(qqp):
    collections = {
        col: descriptor.collection for col, descriptor, _ in get_quiz_stats()
    }
    collections = [collections[x] for x in qqp.all_stats]
    return collections


def collections_index(qqp):
    collections = collections_each(qqp)
    collection_to_i = {
        col: i for i, col in enumerate(sorted(set(collections), key=str))
    }
    return np.array([collection_to_i[x] for x in collections])


@permacache(
    "urbanstats/games/quiz_question_distribution/compute_quiz_question_possibilities",
    key_function=dict(tables_by_type=stable_hash),
)
def compute_quiz_question_possibilities(tables_by_type):
    return QuizQuestionPossibilities.compute_quiz_question_possibilities(tables_by_type)


def produce_quiz_question_weights(tables_by_type):
    qqp = compute_quiz_question_possibilities(tables_by_type)
    geo_target = compute_geo_target(qqp, tables_by_type)
    stat_target = compute_stat_target(qqp)
    return produce_quiz_question_weights_direct(tables_by_type, geo_target, stat_target)


@permacache(
    "urbanstats/games/quiz_question_distribution/produce_quiz_question_weights_direct",
    key_function=dict(
        tables_by_type=stable_hash, geo_target=stable_hash, stat_target=stable_hash
    ),
)
def produce_quiz_question_weights_direct(tables_by_type, geo_target, stat_target):
    qqp = compute_quiz_question_possibilities(tables_by_type)
    ps = qqp.train(geo_target, stat_target)
    return dict(ps=ps, geo_target=geo_target, stat_target=stat_target, qqp=qqp)
