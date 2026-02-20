import json
import os

from urbanstats.protobuf.utils import write_gzip

SHARD_SIZE_LIMIT_BYTES = 512 * 1024


def shard_bytes(longname):
    """translation of links.ts::shardBytes"""
    bytes_ = longname.encode("utf-8")
    hash_ = 0
    for b in bytes_:
        hash_ = (hash_ * 31 + b) & 0xFFFFFFFF
    string = ""
    for _ in range(4):
        string += hex(hash_ & 0xF)[2:]
        hash_ >>= 4
    return string[0:2], string[2:3]


def sanitize(x):
    return x.replace("/", " slash ")


def create_foldername(x):
    x = sanitize(x)
    a, b = shard_bytes(x)
    return f"{a}/{b}"


def create_filename(x, ext):
    x = sanitize(x)
    return f"{create_foldername(x)}/{x}." + ext


def all_foldernames():
    hexes = "0123456789abcdef"
    return [f"{a0}{a1}/{b}" for a0 in hexes for a1 in hexes for b in hexes]


def consolidate_shards(folder, *, build_consolidated):
    """
    For each shard folder under folder whose total size is below the limit,
    merge all .gz files using build_consolidated(gz_files), write to shard.gz,
    remove per-item files. Symlinks stay separate.

    build_consolidated receives a list of (longname, filepath) and returns a
    protobuf message to write.
    Returns list of shard folder strings that were consolidated.
    """
    out = []
    for shard_folder in all_foldernames():
        shard_path = os.path.join(folder, shard_folder)
        total_size = 0
        gz_files = []
        for name in os.listdir(shard_path):
            fp = os.path.join(shard_path, name)
            total_size += os.path.getsize(fp)
            gz_files.append((name[:-3], fp))
        if total_size == 0:
            continue
        if total_size >= SHARD_SIZE_LIMIT_BYTES:
            continue
        consolidated = build_consolidated(gz_files)
        out_path = os.path.join(folder, f"{shard_folder}.gz")
        write_gzip(consolidated, out_path)
        for _, fp in gz_files:
            os.remove(fp)
        os.rmdir(shard_path)
        out.append(shard_folder)
    return out


def output_unshard_config(data_dir, shard_folders, type_label):
    """Write consolidated shard list for one type to react/src/data.

    Called right after producing geometry or data. The frontend imports
    these JSON files from react/src/data.

    Args:
        data_dir: Path to react/src/data (e.g. "react/src/data")
        shard_folders: List of shard folder strings (e.g. ["0a/1", "2b/3"])
        type_label: "shape" or "data" (determines output filename)
    """
    if type_label not in ("shape", "data"):
        raise ValueError("type_label must be 'shape' or 'data'")
    os.makedirs(data_dir, exist_ok=True)
    path = os.path.join(data_dir, f"unshard_{type_label}.json")
    with open(path, "w") as f:
        json.dump(sorted(shard_folders), f, indent=0)
