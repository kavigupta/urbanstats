import argparse
import ast
import json
import os
import subprocess

import requests

current = __file__
fixed_py_file = os.path.join(os.path.dirname(current), "fixed.py")


def load_fixed_py():
    with open(fixed_py_file, "r") as f:
        fixed_py = f.read()
    tree = ast.parse(fixed_py)
    tree = tree.body
    assert all(isinstance(x, ast.Assign) for x in tree)
    # go from tree to dict
    fixed = {}
    for x in tree:
        assert len(x.targets) == 1
        key = x.targets[0].id
        value = x.value
        fixed[key] = value.n
    return fixed


def save_fixed_py(fixed):
    with open(fixed_py_file, "w") as f:
        f.write("\n")
        for key, value in fixed.items():
            f.write(f"{key} = {value}\n")

    subprocess.check_call(f"python -m black {fixed_py_file}", shell=True)


def copy_up_to(key, new_up_to, folder=None):
    source_folder = {
        "juxtastat": "quiz",
        "retrostat": "retrostat",
    }[key]
    dest_folder = {
        "juxtastat": "stored_quizzes/juxtastat",
        "retrostat": "stored_quizzes/retrostat",
    }[key]
    fixed_py = load_fixed_py()
    for retrostat_week in range(fixed_py[key], new_up_to + 1):
        source = os.path.join(
            "https://urbanstats.org", source_folder, str(retrostat_week)
        )
        dest = os.path.join(dest_folder, str(retrostat_week))
        print(f"Copying {source} to {dest}")
        response = requests.get(source, timeout=10)
        if response.status_code == 200:
            data = response.content
        else:
            print(f"Failed to get {source}")
            print("finding locally")
            assert folder is not None, "Must provide folder"
            source = os.path.join(folder, source_folder, str(retrostat_week))
            with open(source, "rb") as f:
                data = f.read()
        assert data, f"Somehow, {source} is empty"
        # check that it's valid json
        _ = json.loads(data.decode("utf-8"))
        with open(dest, "wb") as f:
            f.write(data)
    fixed_py[key] = new_up_to
    save_fixed_py(fixed_py)
    os.system(f"git add {dest_folder} {fixed_py_file}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Copy juxtastat/retrostat data up to a given week/day."
    )
    parser.add_argument(
        "key",
        choices=("juxtastat", "retrostat"),
        help="Which fixed data to update",
    )
    parser.add_argument(
        "new_up_to",
        type=int,
        help="New upper bound (week for retrostat, day for juxtastat)",
    )
    parser.add_argument(
        "--folder",
        default=None,
        help="Local site folder if remote fetch fails",
    )
    args = parser.parse_args()
    copy_up_to(args.key, args.new_up_to, folder=args.folder)
