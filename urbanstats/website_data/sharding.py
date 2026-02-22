import gzip
import os

import tqdm.auto as tqdm

from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip

# Per-type shard size limits (bytes). Shape shards smaller for faster loads.
SHARD_SIZE_LIMIT_SHAPE_BYTES = 8 * 1024   # 8K
SHARD_SIZE_LIMIT_DATA_BYTES = 64 * 1024   # 64K

# Size-based sharding: sort items by full 8-char hash, pack by byte limit as we go, write each shard when full.
# Each shard: one gzipped proto (ConsolidatedArticles or ConsolidatedShapes). No per-item disk I/O.


def shard_bytes_full(longname):
    """Full 8-char hex hash for ordering; must match links.ts shardBytesFull."""
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


def shard_bytes(longname):
    """First 2 + 1 hex chars; used only for symlinks folder names (create_foldername)."""
    full = shard_bytes_full(longname)
    return full[0:2], full[2:3]


def sanitize(x):
    return x.replace("/", " slash ")


def create_foldername(x):
    """Used for symlinks: one .symlinks.gz per (2+1) hash folder."""
    x = sanitize(x)
    a, b = shard_bytes(x)
    return f"{a}/{b}"


def create_filename(x, ext):
    """Path for writing a single .gz during build (before size-based sharding)."""
    x = sanitize(x)
    return f"{create_foldername(x)}/{x}." + ext


def all_foldernames():
    """All (2+1) hash folder names; used for symlinks."""
    hexes = "0123456789abcdef"
    return [f"{a0}{a1}/{b}" for a0 in hexes for a1 in hexes for b in hexes]


def shard_subfolder(shard_idx):
    """Nested path for shard index: A/B where A is second-last hex digit, B is last hex digit. 256 -> 0/0."""
    s = format(shard_idx, "x")
    a = s[-2] if len(s) >= 2 else "0"
    b = s[-1]
    return f"{a}/{b}"


def _symlinks_in_range(symlinks, range_start_hash, range_end_hash):
    """Return (link_names, target_names) for symlinks whose link_name hash is in (range_start, range_end]."""
    link_names = []
    target_names = []
    for link_name, target_name in symlinks.items():
        h = shard_bytes_full(sanitize(link_name))
        if (range_start_hash is None or h > range_start_hash) and h <= range_end_hash:
            link_names.append(link_name)
            target_names.append(target_name)
    return link_names, target_names


def build_shards_from_callback(folder, type_label, longnames, get_proto_fn, symlinks=None):
    """
    Build size-based shards by requesting each proto from a callback. No full list of protos in memory.

    longnames: list of longname strings (real articles only; no symlink names).
    get_proto_fn: callable(longname) -> Article or Feature. Called once per longname in sorted order.
    symlinks: optional dict link_name -> target_name for data shards; stored as symlinks in shard, not duplicated.

    Sort longnames by full 8-char hash, pack by size, write each shard. For data, add symlinks whose
    link_name hashes into each shard's range to that shard's symlink_link_names / symlink_target_names.

    Returns list of hash strings that start each shard (for frontend index).
    """
    if not longnames:
        return []

    # Sort by full hash (bytes order)
    longnames = sorted(longnames, key=lambda ln: shard_bytes_full(sanitize(ln)))

    if type_label == "data":
        consolidated_class = data_files_pb2.ConsolidatedArticles
        size_limit = SHARD_SIZE_LIMIT_DATA_BYTES
    else:
        consolidated_class = data_files_pb2.ConsolidatedShapes
        size_limit = SHARD_SIZE_LIMIT_SHAPE_BYTES

    os.makedirs(folder, exist_ok=True)
    index_hashes = []
    shard_idx = 0
    current_longnames = []
    current_protos = []
    current_size = 0
    range_start_hash = None  # exclusive lower bound for current shard

    def write_shard(longnames_chunk, protos_chunk):
        consolidated = consolidated_class()
        consolidated.longnames.extend(longnames_chunk)
        if type_label == "data":
            consolidated.articles.extend(protos_chunk)
            end_hash = shard_bytes_full(sanitize(longnames_chunk[-1]))
            if symlinks:
                link_names, target_names = _symlinks_in_range(
                    symlinks, range_start_hash, end_hash
                )
                consolidated.symlink_link_names.extend(link_names)
                consolidated.symlink_target_names.extend(target_names)
        else:
            consolidated.shapes.extend(protos_chunk)
        subfolder = os.path.join(folder, shard_subfolder(shard_idx))
        os.makedirs(subfolder, exist_ok=True)
        write_gzip(consolidated, os.path.join(subfolder, f"shard_{shard_idx}.gz"))

    for longname in tqdm.tqdm(longnames, desc=f"building {type_label} shards", unit="item"):
        proto = get_proto_fn(longname)
        if isinstance(proto, (list, tuple)):
            proto = proto[0]
        raw = proto.SerializeToString()
        size = len(gzip.compress(raw, mtime=0))

        current_hash = shard_bytes_full(sanitize(longname))
        last_hash = shard_bytes_full(sanitize(current_longnames[-1])) if current_longnames else None
        # Flush only when over limit and (shard empty or next item has different hash — keep hash collisions in same shard).
        if (
            current_size + size > size_limit
            and current_longnames
            and (last_hash is None or current_hash != last_hash)
        ):
            write_shard(current_longnames, current_protos)
            index_hashes.append(shard_bytes_full(sanitize(current_longnames[0])))
            range_start_hash = shard_bytes_full(sanitize(current_longnames[-1]))
            shard_idx += 1
            current_longnames = []
            current_protos = []
            current_size = 0

        current_longnames.append(longname)
        current_protos.append(proto)
        current_size += size

    if current_longnames:
        write_shard(current_longnames, current_protos)
        index_hashes.append(shard_bytes_full(sanitize(current_longnames[0])))

    index_proto = data_files_pb2.ShardIndex()
    index_proto.starting_hashes.extend(int(h, 16) for h in index_hashes)
    write_gzip(index_proto, os.path.join(folder, f"shard_index_{type_label}.gz"))

    return index_hashes


def output_shard_index(data_dir, index_hashes, type_label):
    """Write shard index (array of starting hashes) for one type to react/src/data as proto gzip.

    The frontend loads this and binary-searches to find which shard contains a longname.
    """
    if type_label not in ("shape", "data"):
        raise ValueError("type_label must be 'shape' or 'data'")
    os.makedirs(data_dir, exist_ok=True)
    path = os.path.join(data_dir, f"shard_index_{type_label}.gz")
    index_proto = data_files_pb2.ShardIndex()
    index_proto.starting_hashes.extend(int(h, 16) for h in index_hashes)
    write_gzip(index_proto, path)
