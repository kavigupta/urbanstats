from dataclasses import dataclass
from typing import Dict, List

import numpy as np
import pandas as pd
import tqdm.auto as tqdm
from cached_property import cached_property
from permacache import permacache

from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import save_data_list, save_ordered_list, write_gzip
from urbanstats.universe.annotate_universes import all_universes
from urbanstats.utils import hash_full_table

population_column = "best_population_estimate"
stable_sort_column = "longname"


@dataclass
class OrdinalsForTypeAndColumnInUniverse:
    values: pd.Series
    ordinals: pd.Series
    percentiles_by_population: pd.Series

    @cached_property
    def ordered_longnames(self):
        return list(self.ordinals.sort_values(0).index)

    @cached_property
    def count(self):
        return int((~np.isnan(self.ordered_values)).sum())

    @property
    def ordered_values(self):
        return np.array(self.values.loc[self.ordered_longnames][0])

    @property
    def ordered_percentiles_by_population(self):
        return np.array(self.percentiles_by_population.loc[self.ordered_longnames])


class ProtobufOutputter:
    def __init__(
        self, protobuf_class, protobuf_field, site_folder, path_fn, limit=10**6
    ):
        self.protobuf_class = protobuf_class
        self.protobuf_field = protobuf_field
        self.site_folder = site_folder
        self.path_fn = path_fn
        self.limit = limit
        self.count = 0
        self.size = 0
        self.proto = self.protobuf_class()
        self.fields = []

    def with_name(self, universe, typ, name):
        self.proto.statnames.append(name)
        if self.count > 0:
            self.fields.append(((universe, typ, name), self.count))
        return getattr(self.proto, self.protobuf_field).add()

    def notify(self, size):
        self.size += size

    def flush(self, force=False):
        if self.size < self.limit and not force:
            return
        if self.size == 0:
            return
        write_gzip(self.proto, self.site_folder + self.path_fn(self.count))
        self.size = 0
        self.count += 1
        self.proto = self.protobuf_class()


@dataclass
class OrdinalsForTypeInUniverse:
    # key_column -> OrdinalsForColumnInUniverse
    ordinals_by_stat: Dict[str, OrdinalsForTypeAndColumnInUniverse]
    all_names: List[str]

    def output_order_files(self, site_folder, universe, typ, order_backmap):
        from create_website import get_statistic_column_path
        from produce_html_page import internal_statistic_names

        outputter = ProtobufOutputter(
            data_files_pb2.OrderLists,
            "order_lists",
            site_folder,
            lambda count: f"/order/{universe}__{typ}_{count}.gz",
        )

        for statistic_column in tqdm.tqdm(
            internal_statistic_names(), desc=f"outputting ordinals for {universe} {typ}"
        ):
            ordinal = self.ordinals_by_stat[statistic_column]
            order_list = outputter.with_name(
                universe, typ, get_statistic_column_path(statistic_column)
            )
            for idx in [order_backmap[typ][name] for name in ordinal.ordered_longnames]:
                order_list.order_idxs.append(idx)
            outputter.notify(order_list.ByteSize())
            outputter.flush()
        outputter.flush(force=True)
        return outputter.fields

    def output_data_files(self, site_folder, universe, typ):
        from create_website import get_statistic_column_path
        from produce_html_page import internal_statistic_names

        # data_lists = data_files_pb2.DataLists()
        outputter = ProtobufOutputter(
            data_files_pb2.DataLists,
            "data_lists",
            site_folder,
            lambda count: f"/order/{universe}__{typ}_{count}_data.gz",
        )

        for statistic_column in tqdm.tqdm(
            internal_statistic_names(), desc=f"outputting ordinals for {universe}"
        ):
            ordinal = self.ordinals_by_stat[statistic_column]
            data_list = outputter.with_name(
                universe, typ, get_statistic_column_path(statistic_column)
            )
            ordered_values = ordinal.ordered_values
            ordered_percentile = ordinal.ordered_percentiles_by_population
            for value, percentile in zip(ordered_values, ordered_percentile):
                data_list.value.append(value)
                data_list.population_percentile.append(percentile)
            outputter.notify(data_list.ByteSize())
            outputter.flush()
        outputter.flush(force=True)
        return outputter.fields


@dataclass
class OrdinalsInUniverse:
    overall_ordinal: OrdinalsForTypeInUniverse
    ordinal_by_type: Dict[str, OrdinalsForTypeInUniverse]


def compute_ordinals_and_percentiles(frame, key_column, *, just_ordinal):
    key_column_name = key_column
    ordering = (
        frame[[stable_sort_column, key_column_name]]
        .fillna(-float("inf"))
        .sort_values(stable_sort_column)
        .sort_values(key_column_name, ascending=False, kind="stable")
        .index
    )
    # ordinals: index -> ordinal
    ordinals = np.array(
        pd.Series(np.arange(1, frame.shape[0] + 1), index=ordering).loc[frame.index]
    )
    values_series = pd.DataFrame(np.array(frame[key_column_name]), index=frame.longname)
    ordinals_series = pd.DataFrame(ordinals, index=frame.longname)
    if just_ordinal:
        return OrdinalsForTypeAndColumnInUniverse(values_series, ordinals_series, None)
    total_pop = frame[population_column].sum()
    # arranged_pop: ordinal - 1 -> population
    arranged_pop = np.array(frame[population_column][ordering])
    # cum_pop: ordinal - 1 -> population of all prior
    cum_pop = np.cumsum(arranged_pop)
    # percentiles_by_population: index -> percentile
    percentiles_by_population = 1 - cum_pop[ordinals - 1] / total_pop
    return OrdinalsForTypeAndColumnInUniverse(
        values_series,
        ordinals_series,
        pd.Series(percentiles_by_population, index=frame.longname),
    )


def compute_all_ordinals_for_frame(frame, keys, *, just_ordinal):
    return OrdinalsForTypeInUniverse(
        {
            k: compute_ordinals_and_percentiles(frame, k, just_ordinal=just_ordinal)
            for k in keys
        },
        list(frame.longname),
    )


def compute_all_ordinals_for_universe(full, universe, keys) -> OrdinalsInUniverse:
    full = full.copy()
    full = full.reset_index(drop=True)

    ordinal_by_type = {}
    for x in tqdm.tqdm(sorted(set(full.type)), desc=f"adding ordinals {universe!r}"):
        ordinal_by_type[x] = compute_all_ordinals_for_frame(
            full[full.type == x], keys, just_ordinal=False
        )
    return OrdinalsInUniverse(
        overall_ordinal=compute_all_ordinals_for_frame(full, keys, just_ordinal=True),
        ordinal_by_type=ordinal_by_type,
    )


@permacache(
    "urbanstats/ordinals/compute_all_ordinals_4",
    key_function=dict(full=hash_full_table),
)
def compute_all_ordinals(full, keys):
    return {
        universe: compute_all_ordinals_for_universe(
            full[full.universes.apply(lambda x: universe in x)], universe, keys
        )
        for universe in all_universes()
    }


def add_ordinals(frame, keys, ordinals_for_type, *, overall_ordinal):
    assert len(set(keys)) == len(keys)
    frame = frame.copy()
    frame = frame.reset_index(drop=True)
    for k in keys:
        ord_and_pctile = ordinals_for_type[k]
        ordinals, percentiles_by_population = (
            ord_and_pctile.ordinals,
            ord_and_pctile.percentiles_by_population,
        )
        frame[k, "overall_ordinal" if overall_ordinal else "ordinal"] = ordinals.loc[
            frame.longname
        ].values
        if overall_ordinal:
            continue
        frame[k, "total"] = frame[k].shape[0]
        frame[k, "percentile_by_population"] = percentiles_by_population.loc[
            frame.longname
        ].values
    return frame
