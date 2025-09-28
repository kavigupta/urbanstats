#!/usr/bin/env python3

import re
import subprocess
from functools import lru_cache


@lru_cache(None)
def load_file(path):
    with open(path) as f:
        return f.read()


def relevant_files():
    files = subprocess.check_output(["git", "ls-files", "*.py", ":!:legacy"]).decode(
        "utf-8"
    )
    files = files.split("\n")
    files = [f for f in files if f]
    return files


VULTURE_DIRECTIVE = r"#\s+vulture:\s+ignore(\s+--.*)?$"


def is_ignored(line):
    match = re.match(r"^([^:]*):(\d+):", line)
    assert match, "Failed to parse line: " + line
    file, line_no = match.groups()
    line_no = int(line_no) - 1
    text = load_file(file).split("\n")
    assert 0 <= line_no < len(text), (file, line_no, len(text))
    if line_no > 0 and re.match("^" + VULTURE_DIRECTIVE, text[line_no - 1].strip()):
        return True
    return re.match(VULTURE_DIRECTIVE, text[line_no].strip())


def vulture_errors():
    # run the vulture command and capture the output. ignore error return code
    results = subprocess.run(
        [
            "python3",
            "-m",
            "vulture",
            "--min-confidence",
            "10",
            "--sort-by-size",
            *relevant_files(),
            "--exclude",
            "urbanstats/protobuf/data_files_pb2.py",
        ],
        stderr=subprocess.STDOUT,
        stdout=subprocess.PIPE,
        text=True,
        check=False,  # We'll raise the exit code manually based on output
    )

    results = results.stdout

    lines = results.split("\n")
    lines = [line for line in lines if line.strip()]
    lines = [line for line in lines if not is_ignored(line)]
    return lines


def main():
    lines = vulture_errors()
    print("\n".join(lines))
    if lines:
        exit(1)
    exit(0)


if __name__ == "__main__":
    main()
