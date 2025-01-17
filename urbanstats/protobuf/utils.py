import gzip
import os

from . import data_files_pb2


def save_string_list(slist, path):
    res = data_files_pb2.StringList()
    for x in slist:
        res.elements.append(x)
    write_gzip(res, path)


def save_search_index(elements_list, path):
    res = data_files_pb2.SearchIndex()
    for name, priority in elements_list:
        res.elements.append(name)
        res.priorities.append(priority)
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
