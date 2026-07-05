import argparse
import gzip
import os
import subprocess
import sys
import tempfile

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from urbanstats.protobuf import data_files_pb2


type = "ConsolidatedArticles"
path = "/home/kavi/urbanstats-site-backup/densitydb.github.io/data/f/f/shard_8703.gz"


def main():
    with gzip.open(path, "rb") as f:
        proto = getattr(data_files_pb2, type)()
        proto.ParseFromString(f.read())
        print(proto)


if __name__ == "__main__":
    main()
