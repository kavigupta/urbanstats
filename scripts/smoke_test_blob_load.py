#!/usr/bin/env python3
"""
Smoke test: verify that a consolidated shard (.gz proto) can be loaded.

Exercises the same flow as the frontend: fetch whole shard .gz, gunzip,
decode ConsolidatedArticles or ConsolidatedShapes, find item by longname.

Usage:
  python scripts/smoke_test_blob_load.py --base-url http://localhost:5000 --shard-path /shape/shard_0.gz --longname "California, USA"
  python scripts/smoke_test_blob_load.py --base-url http://localhost:5000 --shard-path /data/shard_0.gz --longname "California, USA"

Exit code 0 on success, 1 on failure.
"""

import argparse
import gzip
import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Origin (e.g. http://localhost:8000)",
    )
    parser.add_argument(
        "--shard-path",
        required=True,
        help="Path to shard .gz (e.g. /shape/shard_0.gz or /data/shard_0.gz)",
    )
    parser.add_argument(
        "--longname",
        help="Longname to look up. If omitted, use first in shard.",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="Request timeout in seconds",
    )
    args = parser.parse_args()

    if not args.shard_path.endswith(".gz"):
        print("error: shard-path must end with .gz", file=sys.stderr)
        return 1

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if repo_root not in sys.path:
        sys.path.insert(0, repo_root)
    from urbanstats.protobuf import data_files_pb2

    base = args.base_url.rstrip("/")
    shard_url = base + args.shard_path

    # 1) Fetch whole shard
    try:
        req = urllib.request.Request(shard_url)
        with urllib.request.urlopen(req, timeout=args.timeout) as resp:
            if resp.status != 200:
                print(f"error: GET {shard_url} -> {resp.status}", file=sys.stderr)
                return 1
            gzip_bytes = resp.read()
    except urllib.error.HTTPError as e:
        print(f"error: GET {shard_url} -> HTTP {e.code}: {e.reason}", file=sys.stderr)
        return 1
    except urllib.error.URLError as e:
        print(f"error: GET {shard_url} -> {e.reason}", file=sys.stderr)
        return 1

    # 2) Gunzip
    try:
        raw = gzip.decompress(gzip_bytes)
    except gzip.BadGzipFile as e:
        print(f"error: gzip decompress failed: {e}", file=sys.stderr)
        return 1

    # 3) Decode consolidated proto
    if "/shape/" in args.shard_path:
        shard = data_files_pb2.ConsolidatedShapes()
    elif "/data/" in args.shard_path:
        shard = data_files_pb2.ConsolidatedArticles()
    else:
        print("error: shard-path must contain /shape/ or /data/", file=sys.stderr)
        return 1

    try:
        shard.ParseFromString(raw)
    except Exception as e:
        print(f"error: protobuf decode failed: {e}", file=sys.stderr)
        return 1

    if not shard.longnames:
        print("error: shard has no longnames", file=sys.stderr)
        return 1

    # 4) Find longname
    if args.longname:
        if args.longname not in shard.longnames:
            print(f"error: longname not in shard: {args.longname!r}", file=sys.stderr)
            return 1
        idx = list(shard.longnames).index(args.longname)
    else:
        idx = 0
        args.longname = shard.longnames[0]

    # 5) Verify item
    if "/data/" in args.shard_path:
        msg = shard.articles[idx]
        if not msg.longname:
            print("error: decoded Article has no longname", file=sys.stderr)
            return 1
        print(f"ok: loaded Article longname={msg.longname!r}")
    else:
        msg = shard.shapes[idx]
        if not msg.HasField("polygon") and not msg.HasField("multipolygon"):
            print("error: decoded Feature has no geometry", file=sys.stderr)
            return 1
        print("ok: loaded Feature with geometry")

    return 0


if __name__ == "__main__":
    sys.exit(main())
