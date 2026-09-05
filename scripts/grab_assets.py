import os
import shutil
from tempfile import TemporaryDirectory

from .test_utils import (
    REPO_ROOT,
    get_action,
    get_artifacts,
    pull_request_for_current_branch,
    unzip_artifact,
)


def main():
    pr = pull_request_for_current_branch()
    act = get_action(pr)
    artifacts = get_artifacts(act)["artifacts"]

    # The per-shard artifacts are merged into this one by the merge-assets job, which
    # uploads nothing when no asset changed.
    combined_name = f"combined-{act['run_attempt']}"
    if not any(artifact["name"] == combined_name for artifact in artifacts):
        print("No assets changed in this run")
        return

    delta_location = os.path.expanduser("~/Downloads/temp/delta")
    shutil.rmtree(delta_location, ignore_errors=True)
    os.makedirs(delta_location)

    with TemporaryDirectory() as combined:
        unzip_artifact(artifacts, combined_name, combined)
        copy_tree(os.path.join(combined, "delta"), delta_location)
        copy_tree(
            os.path.join(combined, "changed_assets"),
            os.path.join(REPO_ROOT, "reference_test_assets"),
        )

    # print the location of the delta as a link
    print(f"file://{delta_location}")


def copy_tree(src, dest):
    if not os.path.isdir(src):
        print(f"{os.path.basename(src)} is empty")
        return
    shutil.copytree(
        src,
        dest,
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns("*.error.png"),
    )


if __name__ == "__main__":
    main()
