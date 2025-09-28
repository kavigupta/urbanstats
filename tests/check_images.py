import os
import shutil
import sys

import numpy as np
from PIL import Image


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

def compute_delta_image(ref, act):
    ref, act = pad_images(ref, act)
    color = [255, 0, 255, 255]
    diff_mask = (act != ref).any(-1)
    ref[diff_mask] = color
    indicator = np.zeros_like(ref, shape=(ref.shape[0], 100, ref.shape[-1]))
    indicator[..., -1] = 255
    indicator[diff_mask.any(-1)] = color
    delta = np.concatenate([ref, indicator], axis=1)
    return diff_mask.any(), delta


def test_paths(reference, actual, delta_path, changed_path):
    ref = np.array(Image.open(reference))
    act = np.array(Image.open(actual))
    diff, delta = compute_delta_image(ref, act)
    if not diff:
        return True
    os.makedirs(os.path.dirname(delta_path), exist_ok=True)
    Image.fromarray(delta).save(delta_path)
    print(f"{reference} and {actual} are different")
    os.makedirs(os.path.dirname(changed_path), exist_ok=True)
    shutil.copy(actual, changed_path)
    return False


def test_all_same(reference, actual, delta, changed):
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
                os.makedirs(os.path.dirname(changed_path), exist_ok=True)
                shutil.copy(actual_path, changed_path)
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
            errors += not test_paths(
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
        test_all_same(
            reference=f"reference_test_screenshots/{args.test}",
            actual=f"react/screenshots/{args.test}",
            delta=f"react/delta/{args.test}",
            changed=f"react/changed_screenshots/{args.test}",
        )
    else:
        test_all_same(
            reference="reference_test_screenshots",
            actual="react/screenshots",
            delta="react/delta",
            changed="react/changed_screenshots",
        )
