import difflib
import gzip
import os
import shutil
import sys

import numpy as np
from PIL import Image


def special_case_extra_row_of_pixels(ref, act, _name):
    """
    Handles the special case where one image has an extra row of pixels at the bottom
    that is identical to the row above it. This causes test flakes but does not reflect
    a meaningful semantic difference in the images.
    """
    if abs(ref.shape[0] - act.shape[0]) != 1:
        return None
    minimal_height = min(ref.shape[0], act.shape[0])
    last_two_rows = ref[-2:] if ref.shape[0] < act.shape[0] else act[-2:]
    if not (last_two_rows[0] == last_two_rows[1]).all():
        return None
    ref = ref[:minimal_height]
    act = act[:minimal_height]
    return ref, act


DIFFERENCE_THRESHOLD = 15


def special_case_small_total_difference(ref, act, name):
    """
    Ignore when images have a very small difference, typically due to aliasing.
    """
    if ref.shape != act.shape:
        return None
    # astype to handle underflow
    total_diff = np.abs(act.astype(np.int16) - ref.astype(np.int16)).sum()
    if total_diff <= DIFFERENCE_THRESHOLD:
        if total_diff > 0:
            print(f"({name}) ignoring small total difference: {total_diff}")
        return ref, ref
    return None


def special_case_handle(ref, act, name):
    for fn in [special_case_extra_row_of_pixels, special_case_small_total_difference]:
        res = fn(ref, act, name)
        if res is not None:
            ref, act = res
    return ref, act


def pad_images(ref, act):
    if ref.shape[0] > act.shape[0]:
        act = np.pad(act, ((0, ref.shape[0] - act.shape[0]), (0, 0), (0, 0)))
    elif ref.shape[0] < act.shape[0]:
        ref = np.pad(ref, ((0, act.shape[0] - ref.shape[0]), (0, 0), (0, 0)))
    if ref.shape[1] > act.shape[1]:
        act = np.pad(act, ((0, 0), (0, ref.shape[1] - act.shape[1]), (0, 0)))
    elif ref.shape[1] < act.shape[1]:
        ref = np.pad(ref, ((0, 0), (0, act.shape[1] - ref.shape[1]), (0, 0)))
    return ref, act


def compute_delta_image(ref, act, name=""):
    ref, act = special_case_handle(ref, act, name)
    ref, act = pad_images(ref, act)
    color = [255, 0, 255, 255]
    diff_mask = (act != ref).any(-1)
    ref[diff_mask] = color
    indicator = np.zeros_like(ref, shape=(ref.shape[0], 100, ref.shape[-1]))
    indicator[..., -1] = 255
    indicator[diff_mask.any(-1)] = color
    delta = np.concatenate([ref, indicator], axis=1)
    return diff_mask.any(), delta


def compare_images(reference, actual, delta_path):
    ref = np.array(Image.open(reference))
    act = np.array(Image.open(actual))
    diff, delta = compute_delta_image(ref, act, name=reference)
    if not diff:
        return True
    make_parent(delta_path)
    Image.fromarray(delta).save(delta_path)
    return False


def read_text(path):
    opener = gzip.open if path.endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as f:
        return f.read()


def common_prefix_length(ref_lines, act_lines):
    length = 0
    for ref_line, act_line in zip(ref_lines, act_lines):
        if ref_line != act_line:
            break
        length += 1
    return length


# difflib is quadratic in the region it has to align, and the geojson references run to
# over a million lines. Past this, report the shape of the change instead of aligning it.
DIFF_REGION_LIMIT = 5000
DIFF_REGION_PREVIEW = 20


def compute_delta_text(ref, act):
    ref_lines = ref.splitlines()
    act_lines = act.splitlines()
    head = common_prefix_length(ref_lines, act_lines)
    tail = common_prefix_length(ref_lines[head:][::-1], act_lines[head:][::-1])
    ref_region = ref_lines[head : len(ref_lines) - tail]
    act_region = act_lines[head : len(act_lines) - tail]
    preamble = [
        f"reference and actual agree on the first {head} and last {tail} lines.",
        f"Line numbers below are relative to line {head + 1}.",
        "",
    ]
    if max(len(ref_region), len(act_region)) > DIFF_REGION_LIMIT:
        return "\n".join(
            preamble
            + [
                f"The differing region is too large to align: "
                f"{len(ref_region)} reference lines vs {len(act_region)} actual lines.",
                "",
                f"--- reference (first {DIFF_REGION_PREVIEW} lines of the region)",
            ]
            + ref_region[:DIFF_REGION_PREVIEW]
            + ["", f"+++ actual (first {DIFF_REGION_PREVIEW} lines of the region)"]
            + act_region[:DIFF_REGION_PREVIEW]
        )
    return "\n".join(
        preamble
        + list(
            difflib.unified_diff(
                ref_region, act_region, "reference", "actual", lineterm=""
            )
        )
    )


def compare_text(reference, actual, delta_path):
    ref = read_text(reference)
    act = read_text(actual)
    if ref == act:
        return True
    diff_path = f"{delta_path}.diff"
    make_parent(diff_path)
    with open(diff_path, "w", encoding="utf-8") as f:
        f.write(compute_delta_text(ref, act) + "\n")
    return False


def make_parent(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)


TEXT_SUFFIXES = (".csv", ".txt", ".json", ".xml")


def comparator(path):
    if path.endswith(".png"):
        return compare_images
    if path.removesuffix(".gz").endswith(TEXT_SUFFIXES):
        return compare_text
    raise ValueError(f"No comparator for {path}")


def compare_asset(reference, actual, delta_path, changed_path):
    if comparator(reference)(reference, actual, delta_path):
        return True
    print(f"{reference} and {actual} are different")
    copy_to_changed(actual, changed_path)
    return False


def copy_to_changed(actual, changed_path):
    make_parent(changed_path)
    shutil.copy(actual, changed_path)


def compare_all(reference, actual, delta, changed):
    shutil.rmtree(delta, ignore_errors=True)
    errors = 0
    for root, _, files in os.walk(actual):
        for file in files:
            actual_path = os.path.join(root, file)
            relative = os.path.relpath(actual_path, actual)
            reference_path = os.path.join(reference, relative)
            changed_path = os.path.join(changed, relative)
            if not os.path.isfile(reference_path):
                errors += 1
                print(f"Expected reference file {reference_path} not found")
                copy_to_changed(actual_path, changed_path)
    for root, _, files in os.walk(reference):
        for file in files:
            reference_path = os.path.join(root, file)
            relative = os.path.relpath(reference_path, reference)
            actual_path = os.path.join(actual, relative)
            changed_path = os.path.join(changed, relative)
            if not os.path.isfile(actual_path):
                errors += 1
                print(f"Expected actual file {actual_path} not found")
                continue
            delta_path = os.path.join(delta, relative)
            errors += not compare_asset(
                reference_path, actual_path, delta_path, changed_path
            )
    if errors:
        print(f"{errors} errors found")
        sys.exit(1)
    else:
        print("All tests passed")


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--test", required=False)
    args = p.parse_args()
    if args.test:
        compare_all(
            reference=f"reference_test_assets/{args.test}",
            actual=f"react/test_assets/{args.test}",
            delta=f"react/delta/{args.test}",
            changed=f"react/changed_assets/{args.test}",
        )
    else:
        compare_all(
            reference="reference_test_assets",
            actual="react/test_assets",
            delta="react/delta",
            changed="react/changed_assets",
        )
