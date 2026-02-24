#!/usr/bin/env python3
"""
Try to load article "USA" from the built data shards (same logic as frontend).

Usage:
  python scripts/try_load_usa.py [site_folder] [longname]
  e.g. python scripts/try_load_usa.py site USA
  e.g. python scripts/try_load_usa.py dist USA

Requires the same Python env as the build (google.protobuf). Run from repo root.
Reads {site_folder}/data/shard_index_data.gz and finds the shard for the longname's hash,
then loads that shard and looks for the longname in longnames or symlink_link_names.
"""
import gzip
import os
import sys

# Add project root for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from urbanstats.protobuf import data_files_pb2
from urbanstats.website_data.sharding import sanitize, shard_bytes_full, shard_subfolder


def unwrap_signed_int32(x):
    """Proto int32 to unsigned 32-bit (match JS >>> 0)."""
    return x & 0xFFFFFFFF


def find_shard_index(hash_u, index_unsigned):
    """Binary search: largest i such that index[i] <= hash. Match links.ts findShardIndex."""
    if not index_unsigned:
        return 0
    lo, hi = 0, len(index_unsigned) - 1
    while lo < hi:
        mid = (lo + hi + 1) >> 1
        if index_unsigned[mid] <= hash_u:
            lo = mid
        else:
            hi = mid - 1
    return lo if index_unsigned[lo] <= hash_u else 0


def main():
    site_folder = sys.argv[1] if len(sys.argv) > 1 else "site"
    longname = sys.argv[2] if len(sys.argv) > 2 else "USA"

    data_dir = os.path.join(site_folder, "data")
    index_path = os.path.join(data_dir, "shard_index_data.gz")

    if not os.path.isfile(index_path):
        print(f"Shard index not found: {index_path}")
        print("Run the build first (e.g. with 'articles' step) or pass the correct site folder.")
        sys.exit(1)

    # Load shard index
    with gzip.open(index_path, "rb") as f:
        index_proto = data_files_pb2.ShardIndex()
        index_proto.ParseFromString(f.read())
    index_signed = list(index_proto.starting_hashes)
    index_unsigned = [unwrap_signed_int32(x) for x in index_signed]

    # Hash for longname (same as frontend)
    sanitized = sanitize(longname)
    hash_str = shard_bytes_full(sanitized)
    hash_int = int(hash_str, 16)
    hash_u = hash_int & 0xFFFFFFFF

    shard_idx = find_shard_index(hash_u, index_unsigned)
    subfolder = shard_subfolder(shard_idx)
    shard_path = os.path.join(data_dir, subfolder, f"shard_{shard_idx}.gz")

    print(f"Longname: {longname!r}")
    print(f"Sanitized: {sanitized!r}")
    print(f"Hash (hex): {hash_str}")
    print(f"Hash (uint32): {hash_u}")
    print(f"Shard index has {len(index_unsigned)} entries")
    print(f"Binary search -> shard index {shard_idx}")
    if shard_idx > 0:
        print(f"  index[{shard_idx - 1}] = {index_unsigned[shard_idx - 1]} (0x{index_unsigned[shard_idx - 1]:08x})")
    print(f"  index[{shard_idx}] = {index_unsigned[shard_idx]} (0x{index_unsigned[shard_idx]:08x})")
    if shard_idx + 1 < len(index_unsigned):
        print(f"  index[{shard_idx + 1}] = {index_unsigned[shard_idx + 1]} (0x{index_unsigned[shard_idx + 1]:08x})")
    print(f"Shard path: {shard_path}")

    if not os.path.isfile(shard_path):
        print(f"Shard file not found: {shard_path}")
        sys.exit(1)

    with gzip.open(shard_path, "rb") as f:
        shard = data_files_pb2.ConsolidatedArticles()
        shard.ParseFromString(f.read())

    # Look up in longnames
    if longname in shard.longnames:
        idx = list(shard.longnames).index(longname)
        print(f"Found in shard longnames at index {idx}")
        print(f"Article shortname: {shard.articles[idx].shortname}")
        return

    # Look up in symlinks
    link_names = list(shard.symlink_link_names) if shard.symlink_link_names else []
    target_names = list(shard.symlink_target_names) if shard.symlink_target_names else []
    if longname in link_names:
        idx = link_names.index(longname)
        target = target_names[idx] if idx < len(target_names) else "?"
        print(f"Found as symlink in shard: link_name={longname!r} -> target={target!r}")
        return

    print("NOT FOUND in this shard.")
    print(f"Shard longnames (first 20): {list(shard.longnames)[:20]}")
    print(f"Shard symlink_link_names (first 20): {link_names[:20]}")
    print(f"Shard has {len(shard.longnames)} articles, {len(link_names)} symlinks")
    sys.exit(1)


if __name__ == "__main__":
    main()
