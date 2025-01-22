import gzip
import os
import json
import subprocess

from . import data_files_pb2


def save_string_list(slist, path):
    res = data_files_pb2.StringList()
    for x in slist:
        res.elements.append(x)
    write_gzip(res, path)


def save_search_index(elements_list, path):
    temp_file = f"{path}.temp.json"
    with open(temp_file, "w"):
        json.dump(elements_list, f)
    try:
        subprocess.run(
            f"npm run build-search-index -- --input={os.path.abspath(temp_file)} --output={os.path.abspath(path)}",
            check=True,
            shell=True,
            cwd="react",
        )
    finally:
        os.remove(temp_file)


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
