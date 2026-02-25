"""
Like `git diff`, but for protobuf files.
"""

import argparse
import gzip
import os
import subprocess
import sys
import tempfile

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from urbanstats.protobuf import data_files_pb2


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("typ", help="Protobuf type")
    parser.add_argument("old", help="Old protobuf file/directory")
    parser.add_argument("new", help="New protobuf file/directory")
    parser.add_argument("file", help="File to diff")
    parser.add_argument(
        "--extra-args", nargs="*", help="Extra args to pass to git diff", default=[]
    )
    args = parser.parse_args()
    if args.file:
        args.old = os.path.join(args.old, args.file)
        args.new = os.path.join(args.new, args.file)

    typ = getattr(data_files_pb2, args.typ)

    with gzip.open(args.old, "rb") as f:
        old = typ()
        old.ParseFromString(f.read())

    with gzip.open(args.new, "rb") as f:
        new = typ()
        new.ParseFromString(f.read())

    # put both into a directory
    with tempfile.TemporaryDirectory() as tmpdir:
        old_path = os.path.join(tmpdir, "old")
        new_path = os.path.join(tmpdir, "new")
        with open(old_path, "w") as f:
            f.write(str(old))
        with open(new_path, "w") as f:
            f.write(str(new))

        # run diff
        args = ["-" + x for x in args.extra_args]
        subprocess.run(
            ["git", "diff", *args, "--no-index", old_path, new_path], check=False
        )


if __name__ == "__main__":
    main()
