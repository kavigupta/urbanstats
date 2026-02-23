import gzip
import os

import tqdm.auto as tqdm

from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip, write_gzip_bytes
from urbanstats.website_data.shard_index_rounding import round_shard_index_hashes

# shape shards should be smaller because you load many per page.
SHARD_SIZE_LIMIT_SHAPE_BYTES = 8 * 1024
SHARD_SIZE_LIMIT_DATA_BYTES = 64 * 1024


def _unsigned_to_signed_int32(u):
    return u if u < 2**31 else u - 2**32


def shard_bytes_full(longname):
    """Full 8-char hex hash for ordering; must match shardHash.ts"""
    bytes_ = longname.encode("utf-8")
    hash_ = 0
    for b in bytes_:
        hash_ = (hash_ * 31 + b) & 0xFFFFFFFF
    string = ""
    for _ in range(8):
        string += hex(hash_ & 0xF)[2:]
        hash_ >>= 4
    assert not hash_
    return string


def sanitize(x):
    return x.replace("/", " slash ")


def shard_subfolder(shard_idx):
    """Nested path for shard index: A/B where A is second-last hex digit, B is last hex digit. 256 -> 0/0."""
    s = format(shard_idx, "x")
    a = s[-2] if len(s) >= 2 else "0"
    b = s[-1]
    return f"{a}/{b}"


from abc import ABC, abstractmethod


class DataOrShape(ABC):
    @abstractmethod
    def create_consolidated(self):
        pass

    @abstractmethod
    def add_symlink(self, consolidated_proto, link_name, target_name):
        pass

    @abstractmethod
    def add_proto(self, consolidated_proto, longname, proto):
        pass

    @abstractmethod
    def size_limit(self):
        pass


class ArticleData(DataOrShape):
    def create_consolidated(self):
        return data_files_pb2.ConsolidatedArticles()

    def add_symlink(self, consolidated_proto, link_name, target_name):
        consolidated_proto.symlink_link_names.append(link_name)
        consolidated_proto.symlink_target_names.append(target_name)

    def add_proto(self, consolidated_proto, longname, proto):
        consolidated_proto.longnames.append(longname)
        consolidated_proto.articles.append(proto)

    def size_limit(self):
        return SHARD_SIZE_LIMIT_DATA_BYTES


class ShapeData(DataOrShape):
    def create_consolidated(self):
        return data_files_pb2.ConsolidatedShapes()

    def add_symlink(self, consolidated_proto, link_name, target_name):
        consolidated_proto.symlink_link_names.append(link_name)
        consolidated_proto.symlink_target_names.append(target_name)

    def add_proto(self, consolidated_proto, longname, proto):
        consolidated_proto.longnames.append(longname)
        consolidated_proto.shapes.append(proto)

    def size_limit(self):
        return SHARD_SIZE_LIMIT_SHAPE_BYTES


class ShardBuilder:
    def __init__(self, folder, type_label, data_or_shape: DataOrShape):
        self.folder = folder
        self.type_label = type_label
        self.data_or_shape = data_or_shape
        self.current_proto = self.data_or_shape.create_consolidated()
        self.current_proto_bytes = None
        self.current_proto_size_estimate = 0
        self.index_ranges = []
        self.hash_start = None
        self.hash_end = None

    def add_symlink(self, link_name, target_name):
        self.with_synchronization(
            lambda: self.data_or_shape.add_symlink(
                self.current_proto, link_name, target_name
            ),
            item_name=link_name,
        )

    def add_proto(self, longname, proto):
        def add():
            self.data_or_shape.add_proto(self.current_proto, longname, proto)
            self.current_proto_size_estimate += len(
                gzip.compress(proto.SerializeToString(), mtime=0)
            )

        self.with_synchronization(add, item_name=longname)

    def is_oversize(self):
        if self.current_proto_size_estimate < 0.99 * self.data_or_shape.size_limit():
            return False
        if self.current_proto_bytes is None:
            return False
        return (
            len(gzip.compress(self.current_proto_bytes, mtime=0))
            > self.data_or_shape.size_limit()
        )

    def with_synchronization(self, func, item_name):
        """
        Try to run func() and add its changes to the current proto.

        If the resulting proto is too big, write the current shard and start a new proto before running func() again
        to add it to the new proto.
        """
        item_hash = shard_bytes_full(sanitize(item_name))
        func()
        new_bytes = self.current_proto.SerializeToString()
        if self.is_oversize():
            self.write_current_shard()
            func()
            self.current_proto_bytes = self.current_proto.SerializeToString()
            self.hash_start = self.hash_end = item_hash
        else:
            self.current_proto_bytes = new_bytes
            if self.hash_start is None:
                self.hash_start = item_hash
            else:
                assert (
                    item_hash >= self.hash_end
                ), f"Items out of order: {item_name} with hash {item_hash} < current end {self.hash_end}"
            self.hash_end = item_hash

    def write_current_shard(self):
        assert self.current_proto_bytes is not None, "No items added to current shard"
        assert (
            self.hash_start is not None and self.hash_end is not None
        ), "Hash range not set for current shard"
        index = len(self.index_ranges)
        subfolder = os.path.join(self.folder, shard_subfolder(index))
        self.index_ranges.append((self.hash_start, self.hash_end))
        write_gzip_bytes(
            self.current_proto_bytes, os.path.join(subfolder, f"shard_{index}.gz")
        )
        self.current_proto = self.data_or_shape.create_consolidated()
        self.current_proto_bytes = None
        self.current_proto_size_estimate = 0


def build_shards_from_callback(
    folder, type_label, longnames, get_proto_fn, symlinks=None
):
    """
    Build size-based shards by requesting each proto from a callback. No full list of protos in memory.

    longnames: list of longname strings (real articles only; no symlink names).
    get_proto_fn: callable(longname) -> Article or Feature. Called once per longname in sorted order.
    symlinks: optional dict link_name -> target_name for data shards; stored as symlinks in shard, not duplicated.

    Sort longnames by full 8-char hash, pack by size, write each shard. For data, add symlinks whose
    link_name hashes into each shard's range to that shard's symlink_link_names / symlink_target_names.

    Returns list of hash strings that start each shard (for frontend index).
    """
    # if not longnames:
    #     return []

    # Combined list of (hash, kind, name, target_or_none) with kind 'primary' or 'symlink', sorted by hash.
    primary_entries = [
        (shard_bytes_full(sanitize(ln)), "primary", ln, None) for ln in longnames
    ]
    symlink_entries = [
        (shard_bytes_full(sanitize(ln)), "symlink", ln, tn)
        for ln, tn in (symlinks or {}).items()
    ]
    combined = sorted(primary_entries + symlink_entries, key=lambda x: x[0])

    creator = ShardBuilder(
        folder, type_label, ArticleData() if type_label == "data" else ShapeData()
    )

    for _, kind, name, target in tqdm.tqdm(
        combined, desc=f"building {type_label} shards", unit="item"
    ):
        if kind == "symlink":
            creator.add_symlink(name, target)
        else:
            proto = get_proto_fn(name)
            if isinstance(proto, (list, tuple)):
                proto = proto[0]
            creator.add_proto(name, proto)

    creator.write_current_shard()

    buckets_int = [(int(s, 16), int(e, 16)) for s, e in creator.index_ranges]
    rounded = round_shard_index_hashes(buckets_int)
    index_proto = data_files_pb2.ShardIndex()
    index_proto.starting_hashes.extend(_unsigned_to_signed_int32(r) for r in rounded)
    write_gzip(index_proto, os.path.join(folder, f"shard_index_{type_label}.gz"))
