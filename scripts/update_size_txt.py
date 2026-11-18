import argparse
import os
import subprocess
from typing import Dict, List, Tuple

from .test_utils import get_current_pr_label

SIZE_FILE = os.path.join(os.path.dirname(__file__), "../size.txt")
MIN_MB = 50


def measure_sizes(root: str, min_mb: int = MIN_MB) -> Dict[str, int]:
    """
    Run `du -sm <entries> --total` in `root` and parse the output, returning all
    entries with size >= `min_mb` plus the overall total under key 'total'.
    """
    # Expand * ourselves because we're not using a shell and skip git metadata.
    entries = sorted(e for e in os.listdir(root) if e not in {".git"})
    if not entries:
        return {"total": 0}
    args = ["du", "-sm"] + entries + ["--total"]
    proc = subprocess.run(
        args,
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    sizes: Dict[str, int] = {}
    total_size = 0
    for line in proc.stdout.strip().splitlines():
        parts = line.split("\t", 1)
        if len(parts) != 2:
            continue
        size_str, name = parts
        name = name.strip()
        try:
            size = int(size_str.strip())
        except ValueError:
            continue
        if name == "total":
            total_size = size
        elif size >= min_mb:
            sizes[name] = size

    sizes["total"] = total_size
    return sizes


def parse_last_snapshot(size_file: str) -> Tuple[str, Dict[str, int]]:
    """
    Parse the last snapshot block from size.txt.

    Blocks are assumed to be of the form:

    <label>

    <size>\t<name>
    ...
    <size>\ttotal

    separated by blank lines.
    """
    if not os.path.exists(size_file):
        return "", {}

    with open(size_file, encoding="utf-8") as f:
        lines = [line.rstrip("\n") for line in f]

    blocks: List[Tuple[str, Dict[str, int]]] = []
    i = 0
    n = len(lines)
    while i < n:
        # Skip leading blanks.
        while i < n and not lines[i].strip():
            i += 1
        if i >= n:
            break
        label = lines[i].strip()
        i += 1
        # Optional blank line after label.
        if i < n and not lines[i].strip():
            i += 1
        entries: Dict[str, int] = {}
        while i < n and lines[i].strip():
            parts = lines[i].split()
            if not parts or not parts[0].isdigit():
                break
            size = int(parts[0])
            # Name is the rest of the line after the number.
            name = " ".join(parts[1:])
            entries[name] = size
            i += 1
        if entries:
            blocks.append((label, entries))

    if not blocks:
        return "", {}
    return blocks[-1]


def format_snapshot(label: str, sizes: Dict[str, int]) -> str:
    lines: List[str] = []
    lines.append(label)
    lines.append("")
    # Write each non-total entry sorted by size (ascending).
    for name in sorted(
        (k for k in sizes.keys() if k != "total"), key=lambda n: sizes.get(n, 0)
    ):
        lines.append(f"{sizes[name]:<8}{name}")
    lines.append(f"{sizes.get('total', 0):<8}total")
    lines.append("")
    return "\n".join(lines)


def update_size_file(
    label: str,
    sizes: Dict[str, int],
    size_file: str = SIZE_FILE,
) -> Tuple[Dict[str, int], str]:
    snapshot = format_snapshot(label, sizes)
    with open(size_file, "a", encoding="utf-8") as f:
        f.write("\n" + snapshot)
    return sizes, snapshot


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Compute sizes (in MiB) of key site folders and append a new "
            "snapshot to size.txt."
        )
    )
    parser.add_argument(
        "root",
        help=(
            "Path to the checked-out PR (must be a git repo). "
            "du -sm * --total is run here. The label is inferred from the "
            "current PR on GitHub for this repo/branch."
        ),
    )
    args = parser.parse_args()

    if not os.path.isdir(args.root):
        raise SystemExit(f"Root directory {args.root!r} does not exist.")

    _, prev_sizes = parse_last_snapshot(SIZE_FILE)
    label = get_current_pr_label()
    sizes = measure_sizes(args.root, MIN_MB)
    sizes, _ = update_size_file(label, sizes, SIZE_FILE)

    def percent_change(before: int, after: int) -> str:
        if before <= 0 or before == after:
            return ""
        change = (after - before) / before * 100.0
        sign = "+" if change > 0 else ""
        return f" [{sign}{round(change):.0f}%]"

    # Helper to sort entry names by size (ascending).
    def sort_by_size(data: Dict[str, int]):
        return sorted(
            (k for k in data.keys() if k != "total"), key=lambda n: data.get(n, 0)
        )

    # Print Before section.
    print("**Before:**")
    print("")
    print("```")
    prev_names = sort_by_size(prev_sizes)
    for name in prev_names:
        print(f"{prev_sizes[name]:<8}{name}")
    if "total" in prev_sizes:
        print(f"{prev_sizes['total']:<8}total")
    print("```")
    print("")

    # Print After section with diffs where applicable.
    print("**After:**")
    print("")
    print("```")
    names_union = sorted(set(prev_sizes) | set(sizes), key=lambda n: sizes.get(n, 0))
    for name in names_union:
        before = prev_sizes.get(name, 0)
        after = sizes.get(name, 0)
        suffix = percent_change(before, after)
        base = f"{after:<8}{name}"
        print(f"{base:<30}{suffix}".strip())
    print("```")


if __name__ == "__main__":
    main()
