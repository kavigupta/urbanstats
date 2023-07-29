import gzip

from . import data_files_pb2


def save_string_list(slist, path):
    res = data_files_pb2.StringList()
    for x in slist:
        res.elements.append(x)
    with gzip.open(path, "wb") as f:
        f.write(res.SerializeToString())
