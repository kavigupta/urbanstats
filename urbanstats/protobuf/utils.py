import gzip
import os

from urbanstats.geometry.relationship import ordering_idx as type_ordering_idx

from . import data_files_pb2


def save_string_list(slist, path):
    res = data_files_pb2.StringList()
    for x in slist:
        res.elements.append(x)
    write_gzip(res, path)


def save_search_index(longnames, types, is_usas, path):
    res = data_files_pb2.SearchIndex()
    for name, typ, is_usa in zip(longnames, types, is_usas):
        res.elements.append(name)
        res.metadata.append(
            data_files_pb2.SearchIndexMetadata(
                type=type_ordering_idx[typ], is_usa=is_usa
            )
        )
    write_gzip(res, path)


def save_ordered_list(ordered_list, path):
    res = data_files_pb2.OrderList()
    for x in ordered_list:
        res.order_idxs.append(x)
    write_gzip(res, path)


def ensure_writeable(path):
    folder = os.path.dirname(path)
    try:
        os.makedirs(folder)
    except FileExistsError:
        pass


def write_gzip(proto, path):
    ensure_writeable(path)
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(proto.SerializeToString())
