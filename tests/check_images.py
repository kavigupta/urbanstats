import os
import shutil

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

def get_region_size(bitmap, location):
    queue = [location]
    visited = set()
    while queue:
        x, y = queue.pop()
        if (x, y) in visited:
            continue
        visited.add((x, y))
        if bitmap[x, y]:
            queue.append((x + 1, y))
            queue.append((x - 1, y))
            queue.append((x, y + 1))
            queue.append((x, y - 1))
    return len(visited)

def region_size_bounded(bitmask, size=4 * 4):
    return all(get_region_size(bitmask, (x, y)) <= size for x, y in zip(*np.where(bitmask)))

def handle_normalized_map(ref, act):
    ys, xs = np.where((ref == [0xab, 0xcd, 0xef, 0xff]).all(-1))
    if ys.size == 0:
        return
    ymin, ymax = ys.min(), ys.max()
    xmin, xmax = xs.min(), xs.max()
    bitmask = (act[ymin:ymax, xmin:xmax] != ref[ymin:ymax, xmin:xmax]).any(-1)
    if not region_size_bounded(bitmask):
        return
    act[ymin:ymax, xmin:xmax] = ref[ymin:ymax, xmin:xmax]

def compute_delta_image(ref, act):
    ref, act = pad_images(ref, act)
    handle_normalized_map(ref, act)
    color = [255, 0, 255, 255]
    diff_mask = (act != ref).any(-1)
    ref[diff_mask] = color
    indicator = np.zeros_like(ref, shape=(ref.shape[0], 100, ref.shape[-1]))
    indicator[..., -1] = 255
    indicator[diff_mask.any(-1)] = color
    delta = np.concatenate([ref, indicator], axis=1)
    return diff_mask.any(), delta

def test_paths(reference, actual, delta_path):
    ref = np.array(Image.open(reference))
    act = np.array(Image.open(actual))
    diff, delta = compute_delta_image(ref, act)
    if diff:
        try:
            os.makedirs(os.path.dirname(delta_path))
        except FileExistsError:
            pass
        Image.fromarray(delta).save(delta_path)
        print(f"{reference} and {actual} are different")
        return False
    else:
        return True

def test_all_same(reference="reference_test_screeshots", actual="react/screenshots"):
    shutil.rmtree("react/delta", ignore_errors=True)
    errors = 0
    for root, dirs, files in os.walk(reference):
        for file in files:
            reference_path = os.path.join(root, file)
            relative = os.path.relpath(reference_path, reference)
            actual_path = os.path.join(actual, relative)
            delta_path = os.path.join("react/delta", relative)
            errors += not test_paths(reference_path, actual_path, delta_path)
    if errors:
        print(f"{errors} errors found")
    else:
        print("All tests passed")
if __name__ == "__main__":
    test_all_same()