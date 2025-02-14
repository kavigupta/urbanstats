import gzip
import os

from urbanstats.geometry.relationship import ordering_idx as type_ordering_idx

from . import data_files_pb2


def save_string_list(slist, path):
    res = data_files_pb2.StringList()
    for x in slist:
        res.elements.append(x)
    write_gzip(res, path)


def save_search_index(longnames, types, is_usas, path, *, symlinks):
    longname_to_index = {x: i for i, x in enumerate(longnames)}
    types, is_usas = list(types), list(is_usas)
    orders = [type_ordering_idx[typ] for typ in types]
    res = data_files_pb2.SearchIndex()
    for name, order, is_usa in zip(longnames, orders, is_usas):
        res.elements.append(name)
        res.metadata.append(
            data_files_pb2.SearchIndexMetadata(
                type=order, is_usa=is_usa, is_symlink=False
            )
        )
    for name, target in symlinks.items():
        res.elements.append(name)
        idx = longname_to_index[target]
        res.metadata.append(
            data_files_pb2.SearchIndexMetadata(
                type=orders[idx], is_usa=is_usas[idx], is_symlink=True
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
