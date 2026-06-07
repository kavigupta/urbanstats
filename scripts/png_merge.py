#!/usr/bin/env python3
"""
Git merge driver for PNG files.

Performs a 3-way pixel-level merge: pixels changed only in ours or only in
theirs are accepted automatically. Pixels changed differently in both branches
are a conflict (exits non-zero so git marks the file as conflicted).

Images of different sizes are handled via a 5th "presence" channel (1 = pixel
exists in that image, 0 = padded/absent). All three images are padded to a
common bounding box before comparison, so resizes that agree between ours and
theirs merge cleanly against a differently-sized base.

Usage (configured via .gitattributes + git config merge driver):
    python3 scripts/png_merge.py %O %A %B
        %O = base (ancestor)
        %A = ours  (written in-place with merged result on success)
        %B = theirs
"""

import sys

import numpy as np
from PIL import Image


def load(path: str) -> np.ndarray:
    """Load a PNG as a (H, W, 5) uint8 array with a presence channel."""
    img = np.array(Image.open(path).convert("RGBA"), dtype=np.uint8)
    h, w = img.shape[:2]
    presence = np.ones((h, w, 1), dtype=np.uint8)
    return np.concatenate([img, presence], axis=-1)


def pad_to(arr: np.ndarray, h: int, w: int) -> np.ndarray:
    """Pad arr to (h, w, C) with zeros (presence=0 for added pixels)."""
    ph, pw = h - arr.shape[0], w - arr.shape[1]
    return np.pad(arr, ((0, ph), (0, pw), (0, 0)))


def changed(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Return (H, W) bool array: True where any channel differs."""
    return (a != b).any(axis=-1)


def main() -> int:
    if len(sys.argv) != 4:
        print(f"Usage: {sys.argv[0]} <base> <ours> <theirs>", file=sys.stderr)
        return 1

    base_path, ours_path, theirs_path = sys.argv[1], sys.argv[2], sys.argv[3]

    try:
        base = load(base_path)
        ours = load(ours_path)
        theirs = load(theirs_path)
    except OSError as e:
        print(f"png_merge: failed to open images: {e}", file=sys.stderr)
        return 1

    if ours.shape != theirs.shape:
        print(
            f"png_merge: ours/theirs dimension mismatch "
            f"(ours={ours.shape}, theirs={theirs.shape})",
            file=sys.stderr,
        )
        return 1

    ours_shape = ours.shape[:2]

    # Pad all three to a common bounding box for comparison.
    max_h = max(base.shape[0], ours_shape[0])
    max_w = max(base.shape[1], ours_shape[1])
    base = pad_to(base, max_h, max_w)
    ours = pad_to(ours, max_h, max_w)
    theirs = pad_to(theirs, max_h, max_w)

    ours_changed = changed(ours, base)
    theirs_changed = changed(theirs, base)

    # Both sides changed the same pixel to different values → conflict
    conflict = ours_changed & theirs_changed & changed(ours, theirs)
    if np.any(conflict):
        print(
            f"png_merge: {int(np.sum(conflict))} conflicting pixel(s)", file=sys.stderr
        )
        return 1

    # Apply non-conflicting changes from theirs into ours
    result = ours.copy()
    take_theirs = theirs_changed & ~ours_changed
    result[take_theirs] = theirs[take_theirs]

    # Crop to ours' original size and drop the presence channel before saving.
    result = result[: ours_shape[0], : ours_shape[1], :4]
    Image.fromarray(result, "RGBA").save(ours_path, format="PNG")
    return 0


if __name__ == "__main__":
    sys.exit(main())
