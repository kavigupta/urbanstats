#!/usr/bin/env python3

import subprocess

files = subprocess.check_output(["git", "ls-files", "*.py", ":!:legacy"]).decode(
    "utf-8"
)
files = files.split("\n")
files = [f for f in files if f]

# results = subprocess.check_output(
#     [
#         "python3",
#         "-m",
#         "vulture",
#         "--min-confidence",
#         "10",
#         "--sort-by-size",
#         *files,
#         "--exclude",
#         "urbanstats/protobuf/data_files_pb2.py",
#     ],
#     stderr=subprocess.STDOUT,
# )

# run the vulture command and capture the output. ignore error return code
results = subprocess.run(
    [
        "python3",
        "-m",
        "vulture",
        "--min-confidence",
        "10",
        "--sort-by-size",
        *files,
        "--exclude",
        "urbanstats/protobuf/data_files_pb2.py",
    ],
    stderr=subprocess.STDOUT,
    stdout=subprocess.PIPE,
    text=True,
)

results = results.stdout

lines = results.split("\n")
lines = [line for line in lines if line.strip()]

print("\n".join(lines))
if lines:
    exit(1)
exit(0)
