#!/usr/bin/env python3
"""
Git merge driver for PNG files.

Performs a 3-way pixel-level merge: pixels changed only in ours or only in
theirs are accepted automatically. Pixels changed differently in both branches
are a conflict (exits non-zero so git marks the file as conflicted).

Usage (configured via .gitattributes + git config merge driver):
    python3 scripts/png_merge.py %O %A %B
        %O = base (ancestor)
        %A = ours  (written in-place with merged result on success)
        %B = theirs
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image


def load(path: str) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA"), dtype=np.uint8)


def main() -> int:
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <base> <ours> <theirs>", file=sys.stderr)
        return 1

    base_path, ours_path, theirs_path = sys.argv[1], sys.argv[2], sys.argv[3]

    try:
        base = load(base_path)
        ours = load(ours_path)
        theirs = load(theirs_path)
    except Exception as e:
        print(f"png_merge: failed to open images: {e}", file=sys.stderr)
        return 1

    if base.shape != ours.shape or base.shape != theirs.shape:
        print(
            f"png_merge: dimension mismatch "
            f"(base={base.shape}, ours={ours.shape}, theirs={theirs.shape})",
            file=sys.stderr,
        )
        return 1

    ours_changed = np.any(ours != base, axis=-1)    # (H, W) bool
    theirs_changed = np.any(theirs != base, axis=-1)

    # Both sides changed the same pixel to different values → conflict
    conflict = ours_changed & theirs_changed & np.any(ours != theirs, axis=-1)
    if np.any(conflict):
        n = int(np.sum(conflict))
        print(f"png_merge: {n} conflicting pixel(s)", file=sys.stderr)
        return 1

    # Apply non-conflicting changes from theirs into ours
    result = ours.copy()
    take_theirs = theirs_changed & ~ours_changed
    result[take_theirs] = theirs[take_theirs]

    Image.fromarray(result, "RGBA").save(ours_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
