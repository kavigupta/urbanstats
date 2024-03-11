import gzip

from . import data_files_pb2


def save_string_list(slist, path):
    res = data_files_pb2.StringList()
    for x in slist:
        res.elements.append(x)
    write_gzip(res, path)


def save_data_list(value, population_percentile, path):
    res = data_files_pb2.DataList()
    for x in value:
        res.value.append(x)
    for x in population_percentile:
        res.population_percentile.append(x)
    write_gzip(res, path)


def write_gzip(proto, path):
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(proto.SerializeToString())
