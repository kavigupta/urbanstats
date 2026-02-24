import gzip
import os

from urbanstats.geometry.relationship import ordering_idx as type_ordering_idx

from . import data_files_pb2


def save_article_ordering_list(longnames, path, longname_to_type):
    types = [longname_to_type[x] for x in longnames]
    res = data_files_pb2.ArticleOrderingList()
    for x in longnames:
        res.longnames.append(x)
    for x in types:
        res.types.append(type_ordering_idx[x])
    write_gzip(res, path)


def save_universes_list_by_type(longnames, longname_to_universe, path):
    # pylint: disable=import-outside-toplevel,cyclic-import
    from urbanstats.website_data.create_article_gzips import universe_to_idx

    utoi = universe_to_idx()
    res = data_files_pb2.ArticleUniverseList()
    for x in longnames:
        universes = longname_to_universe[x]
        universes_proto = res.universes.add()
        for u in universes:
            if u in utoi:
                universes_proto.universe_idxs.append(utoi[u])
    write_gzip(res, path)


def save_universes_list_all(table, ordinals, site_folder):
    utoi = dict(zip(table.longname, table.universes))
    for typ in ordinals.types:
        save_universes_list_by_type(
            ordinals.ordered_names("world", typ),
            utoi,
            f"{site_folder}/universes/{typ}.gz",
        )


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


def write_gzip_bytes(bytestring, path):
    ensure_writeable(path)
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(bytestring)
