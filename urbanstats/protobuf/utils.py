import gzip
import os
from typing import Any, Dict, List, Mapping

from urbanstats.geometry.relationship import ordering_idx as type_ordering_idx

from . import data_files_pb2


def save_article_ordering_list(
    longnames: List[str], path: str, longname_to_type: Mapping[str, str]
) -> None:
    types = [longname_to_type[x] for x in longnames]
    res = data_files_pb2.ArticleOrderingList()
    for x in longnames:
        res.longnames.append(x)
    for x in types:
        res.types.append(type_ordering_idx[x])
    write_gzip(res, path)


def save_universes_list_by_type(
    longnames: List[str], longname_to_universe: Mapping[str, List[str]], path: str
) -> None:
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


def save_universes_list_all(table: Any, ordinals: Any, site_folder: str) -> None:
    utoi = dict(zip(table.longname, table.universes))
    for typ in ordinals.types:
        save_universes_list_by_type(
            ordinals.ordered_names("world", typ),
            utoi,
            f"{site_folder}/universes/{typ}.gz",
        )


def save_search_index(
    longnames: List[str],
    types: List[str],
    is_usas: List[bool],
    path: str,
    *,
    symlinks: Dict[str, str],
) -> None:
    longname_to_index = {x: i for i, x in enumerate(longnames)}
    types_list, is_usas_list = list(types), list(is_usas)
    orders = [type_ordering_idx[typ] for typ in types_list]
    res = data_files_pb2.SearchIndex()
    for name, order, is_usa in zip(longnames, orders, is_usas_list):
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
                type=orders[idx], is_usa=is_usas_list[idx], is_symlink=True
            )
        )
    write_gzip(res, path)


def ensure_writeable(path: str) -> None:
    folder = os.path.dirname(path)
    if folder:
        try:
            os.makedirs(folder)
        except FileExistsError:
            pass


def write_gzip(proto: Any, path: str) -> None:
    ensure_writeable(path)
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(proto.SerializeToString())


def write_gzip_bytes(bytestring: bytes, path: str) -> None:
    ensure_writeable(path)
    with gzip.GzipFile(path, "wb", mtime=0) as f:
        f.write(bytestring)
