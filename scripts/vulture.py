#!/usr/bin/env python3

import subprocess


def relevant_files():
    files = subprocess.check_output(["git", "ls-files", "*.py", ":!:legacy"]).decode(
        "utf-8"
    )
    files = files.split("\n")
    files = [f for f in files if f]
    return files


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
    return lines


def main():
    lines = vulture_errors()
    print("\n".join(lines))
    if lines:
        exit(1)
    exit(0)


if __name__ == "__main__":
    main()