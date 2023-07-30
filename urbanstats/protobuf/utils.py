import gzip

from . import data_files_pb2


def save_string_list(slist, path):
    res = data_files_pb2.StringList()
    for x in slist:
        res.elements.append(x)
    write_gzip(res, path)


def write_gzip(proto, path):
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(proto.SerializeToString())
