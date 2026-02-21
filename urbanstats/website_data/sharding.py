import json
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


def build_shards_from_callback(folder, type_label, longnames, get_proto_fn):
    """
    Build size-based shards by requesting each proto from a callback. No full list of protos in memory.

    longnames: list of longname strings.
    get_proto_fn: callable(longname) -> Article or Feature. Called once per longname in sorted order.

    Sort longnames by full 8-char hash, then for each longname call get_proto_fn(longname), get size,
    pack into current shard; when size would exceed limit, write current shard and start next.
    Write shard_0.gz, shard_1.gz, ... and shard_index.json.

    type_label: "shape" or "data".

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

    for longname in tqdm.tqdm(longnames, desc=f"building {type_label} shards", unit="item"):
        proto = get_proto_fn(longname)
        if isinstance(proto, (list, tuple)):
            proto = proto[0]
        size = len(proto.SerializeToString())

        if current_size + size > size_limit and current_longnames:
            # Write current shard under nested A/B/ (hex bytes of index)
            consolidated = consolidated_class()
            consolidated.longnames.extend(current_longnames)
            if type_label == "data":
                consolidated.articles.extend(current_protos)
            else:
                consolidated.shapes.extend(current_protos)
            subfolder = os.path.join(folder, shard_subfolder(shard_idx))
            os.makedirs(subfolder, exist_ok=True)
            write_gzip(consolidated, os.path.join(subfolder, f"shard_{shard_idx}.gz"))
            index_hashes.append(shard_bytes_full(sanitize(current_longnames[0])))
            shard_idx += 1
            current_longnames = []
            current_protos = []
            current_size = 0

        current_longnames.append(longname)
        current_protos.append(proto)
        current_size += size

    if current_longnames:
        consolidated = consolidated_class()
        consolidated.longnames.extend(current_longnames)
        if type_label == "data":
            consolidated.articles.extend(current_protos)
        else:
            consolidated.shapes.extend(current_protos)
        subfolder = os.path.join(folder, shard_subfolder(shard_idx))
        os.makedirs(subfolder, exist_ok=True)
        write_gzip(consolidated, os.path.join(subfolder, f"shard_{shard_idx}.gz"))
        index_hashes.append(shard_bytes_full(sanitize(current_longnames[0])))

    with open(os.path.join(folder, "shard_index.json"), "w") as f:
        json.dump(index_hashes, f, separators=(",", ":"))

    return index_hashes


def output_shard_index(data_dir, index_hashes, type_label):
    """Write shard index (array of starting hashes) for one type to react/src/data.

    The frontend loads this and binary-searches to find which shard contains a longname.
    """
    if type_label not in ("shape", "data"):
        raise ValueError("type_label must be 'shape' or 'data'")
    os.makedirs(data_dir, exist_ok=True)
    path = os.path.join(data_dir, f"shard_index_{type_label}.json")
    with open(path, "w") as f:
        json.dump(index_hashes, f, separators=(",", ":"))
