import json

import tqdm.auto as tqdm

from urbanstats.ordinals.compress_counts import compress_counts, mapify
from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import save_string_list, write_gzip
from urbanstats.statistics.output_statistics_metadata import internal_statistic_names
from urbanstats.statistics.stat_path import get_statistic_column_path
from urbanstats.universe.universe_list import all_universes


class ProtobufOutputter:
    def __init__(
        self, protobuf_class, protobuf_field, site_folder, path_fn, *, limit=10**6
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


def output_order_files(order_info, site_folder, universe, typ):
    outputter = ProtobufOutputter(
        data_files_pb2.OrderLists,
        "order_lists",
        site_folder,
        lambda count: f"/order/{universe}/{typ}_{count}.gz",
    )

    for statistic_column in internal_statistic_names():
        order_list = outputter.with_name(
            universe, typ, get_statistic_column_path(statistic_column)
        )
        for idx in order_info.compute_ordinals(universe, typ, statistic_column):
            order_list.order_idxs.append(idx)
        outputter.notify(order_list.ByteSize())
        outputter.flush()
    outputter.flush(force=True)
    return outputter.fields


def output_data_files(order_info, site_folder, universe, typ):
    # data_lists = data_files_pb2.DataLists()
    outputter = ProtobufOutputter(
        data_files_pb2.DataLists,
        "data_lists",
        site_folder,
        lambda count: f"/order/{universe}/{typ}_{count}_data.gz",
    )

    for statistic_column in internal_statistic_names():
        data_list = outputter.with_name(
            universe, typ, get_statistic_column_path(statistic_column)
        )
        ordered_values, ordered_percentile = order_info.compute_values_and_percentiles(
            universe, typ, statistic_column
        )
        for value, percentile in zip(ordered_values, ordered_percentile):
            data_list.value.append(value)
            data_list.population_percentile.append(percentile)
        outputter.notify(data_list.ByteSize())
        outputter.flush()
    outputter.flush(force=True)
    return outputter.fields


def output_indices(ordinal_info, site_folder, universe):
    order_backmap = {}
    for typ in sorted(
        {t for u, t in ordinal_info.universe_type if t != "overall" and u == universe}
    ):
        # output a string list to /index/universe/typ.gz
        path = f"{site_folder}/index/{universe}/{typ}.gz"
        ordered = ordinal_info.ordered_names(universe, typ)
        save_string_list(ordered, path)
        order_backmap[typ] = {name: i for i, name in enumerate(ordered)}
    path = f"{site_folder}/index/{universe}/overall.gz"
    if (universe, "overall") in ordinal_info.universe_type_to_idx:
        ordered = ordinal_info.ordered_names(universe, "overall")
        save_string_list(ordered, path)
        order_backmap["overall"] = {name: i for i, name in enumerate(ordered)}
    return order_backmap


def output_ordering_for_universe(ordinal_info, site_folder, universe):
    output_indices(ordinal_info, site_folder, universe)
    order_map = []
    if (universe, "overall") in ordinal_info.universe_type_to_idx:
        order_map += output_order_files(
            ordinal_info,
            site_folder,
            universe,
            "overall",
        )
    data_map = []
    typs = sorted(
        {t for u, t in ordinal_info.universe_type if t != "overall" and u == universe}
    )
    for typ in tqdm.tqdm(typs, desc=f"ords for {universe}"):
        order_map += output_order_files(ordinal_info, site_folder, universe, typ)
        data_map += output_data_files(ordinal_info, site_folder, universe, typ)
    return order_map, data_map


def reorganize_counts_for_universe(ordinal_info, counts, universe):
    counts_reorganized = {}
    for col in internal_statistic_names():
        if (universe, "overall") in counts[col]:
            counts_reorganized[col, "overall"] = int(
                counts[col].get((universe, "overall"), 0)
            )
        for typ in sorted({t for _, t in ordinal_info.universe_type if t != "overall"}):
            if (universe, typ) not in counts[col]:
                continue
            counts_reorganized[col, typ] = int(counts[col][(universe, typ)])
    return list(counts_reorganized.items())


def reorganize_counts(ordinal_info, counts):
    return {
        u: reorganize_counts_for_universe(ordinal_info, counts, u)
        for u in tqdm.tqdm(all_universes(), desc="counting")
    }


def output_order(ordinal_info):
    counts = ordinal_info.counts_by_type_universe_col()
    res_uncompressed = reorganize_counts(ordinal_info, counts)
    res = compress_counts(res_uncompressed)
    with open("react/src/data/counts_by_article_type.json", "w") as f:
        json.dump(res, f)


def output_ordering(site_folder, ordinal_info):
    order_map_all = []
    data_map_all = []
    for universe in all_universes():
        order_map, data_map = output_ordering_for_universe(
            ordinal_info, site_folder, universe
        )
        order_map_all += order_map
        data_map_all += data_map
    output_order(ordinal_info)
    with open("react/src/data/order_links.json", "w") as f:
        json.dump(mapify(order_map_all), f)
    with open("react/src/data/data_links.json", "w") as f:
        json.dump(mapify(data_map_all), f)
