import bisect
import gzip
import os

import tqdm.auto as tqdm

from urbanstats.protobuf import data_files_pb2
from urbanstats.protobuf.utils import write_gzip
from urbanstats.website_data.shard_index_rounding import round_shard_index_hashes


# Proto int32 is signed; wrap unsigned 32-bit hash to signed for encoding.
def _unsigned_to_signed_int32(u):
    return u if u < 2**31 else u - 2**32


# Per-type shard size limits (bytes). Shape shards smaller for faster loads.
SHARD_SIZE_LIMIT_SHAPE_BYTES = 8 * 1024  # 8K
SHARD_SIZE_LIMIT_DATA_BYTES = 64 * 1024  # 64K

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


def _symlinks_sorted_by_hash(symlinks):
    """Precompute symlinks as a list of (hash_str, link_name, target_name) sorted by hash_str."""
    return sorted(
        (shard_bytes_full(sanitize(ln)), ln, tn) for ln, tn in symlinks.items()
    )


def _symlinks_in_range_sorted(symlinks_sorted, range_start_hash, range_end_hash):
    """Return (link_names, target_names, last_hash) for symlinks whose hash is in (range_start, range_end].
    symlinks_sorted: list of (hash_str, link_name, target_name) from _symlinks_sorted_by_hash.
    last_hash: hash of the last symlink in range, or None if none.
    """
    hashes = [t[0] for t in symlinks_sorted]
    left = 0 if range_start_hash is None else bisect.bisect_right(hashes, range_start_hash)
    right = bisect.bisect_right(hashes, range_end_hash)
    link_names = [symlinks_sorted[i][1] for i in range(left, right)]
    target_names = [symlinks_sorted[i][2] for i in range(left, right)]
    last_hash = hashes[right - 1] if right > left else None
    return link_names, target_names, last_hash


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
    if not longnames:
        return []

    # Sort by full hash (bytes order)
    longnames = sorted(longnames, key=lambda ln: shard_bytes_full(sanitize(ln)))

    symlinks_sorted = _symlinks_sorted_by_hash(symlinks) if symlinks else None

    if type_label == "data":
        consolidated_class = data_files_pb2.ConsolidatedArticles
        size_limit = SHARD_SIZE_LIMIT_DATA_BYTES
    else:
        consolidated_class = data_files_pb2.ConsolidatedShapes
        size_limit = SHARD_SIZE_LIMIT_SHAPE_BYTES

    os.makedirs(folder, exist_ok=True)
    index_ranges = []  # (start_hash, end_hash) per shard, for rounding
    shard_idx = 0
    current_longnames = []
    current_protos = []
    current_size = 0
    range_start_hash = None  # exclusive lower bound for current shard

    def write_shard(longnames_chunk, protos_chunk, symlink_end_hash):
        """symlink_end_hash: include symlinks with link_hash <= this (use next shard's first hash when available)."""
        consolidated = consolidated_class()
        consolidated.longnames.extend(longnames_chunk)
        last_symlink_hash = None
        if symlinks_sorted is not None:
            link_names, target_names, last_symlink_hash = _symlinks_in_range_sorted(
                symlinks_sorted, range_start_hash, symlink_end_hash
            )
            consolidated.symlink_link_names.extend(link_names)
            consolidated.symlink_target_names.extend(target_names)
        if type_label == "data":
            consolidated.articles.extend(protos_chunk)
        else:
            consolidated.shapes.extend(protos_chunk)
        subfolder = os.path.join(folder, shard_subfolder(shard_idx))
        os.makedirs(subfolder, exist_ok=True)
        write_gzip(consolidated, os.path.join(subfolder, f"shard_{shard_idx}.gz"))
        return max(symlink_end_hash, last_symlink_hash) if last_symlink_hash is not None else symlink_end_hash

    for longname in tqdm.tqdm(
        longnames, desc=f"building {type_label} shards", unit="item"
    ):
        proto = get_proto_fn(longname)
        if isinstance(proto, (list, tuple)):
            proto = proto[0]
        raw = proto.SerializeToString()
        size = len(gzip.compress(raw, mtime=0))

        current_hash = shard_bytes_full(sanitize(longname))
        last_hash = (
            shard_bytes_full(sanitize(current_longnames[-1]))
            if current_longnames
            else None
        )
        # Flush only when over limit and (shard empty or next item has different hash — keep hash collisions in same shard).
        if (
            current_size + size > size_limit
            and current_longnames
            and (last_hash is None or current_hash != last_hash)
        ):
            # Use current_hash (first hash of next shard) as symlink end so this shard gets all symlinks up to the next.
            end_h = shard_bytes_full(sanitize(current_longnames[-1]))
            last_symlink_hash = write_shard(current_longnames, current_protos, current_hash)
            # Next shard's symlink range starts after the last symlink we included (or after end_h if none).
            range_start_hash = last_symlink_hash if last_symlink_hash is not None else end_h
            start_h = shard_bytes_full(sanitize(current_longnames[0]))
            index_ranges.append((start_h, end_h))
            shard_idx += 1
            current_longnames = []
            current_protos = []
            current_size = 0

        current_longnames.append(longname)
        current_protos.append(proto)
        current_size += size

    if current_longnames:
        # Last shard: no next hash, use max so all remaining symlinks are included.
        end_h = shard_bytes_full(sanitize(current_longnames[-1]))
        write_shard(current_longnames, current_protos, "ffffffff")
        start_h = shard_bytes_full(sanitize(current_longnames[0]))
        index_ranges.append((start_h, end_h))

    buckets_int = [(int(s, 16), int(e, 16)) for s, e in index_ranges]
    rounded = round_shard_index_hashes(buckets_int)
    index_proto = data_files_pb2.ShardIndex()
    index_proto.starting_hashes.extend(_unsigned_to_signed_int32(r) for r in rounded)
    write_gzip(index_proto, os.path.join(folder, f"shard_index_{type_label}.gz"))
