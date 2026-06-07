import os
import subprocess

from .test_utils import (
    get_action,
    get_artifacts,
    pull_request_for_current_branch,
    unzip_artifact,
)


def main():
    pr = pull_request_for_current_branch()
    act = get_action(pr)
    artifacts = get_artifacts(act)

    delta_location = os.path.expanduser("~/Downloads/temp/delta")

    # delete and recreate the delta location
    subprocess.run(["rm", "-rf", delta_location], check=False)
    os.makedirs(delta_location)

    unzip_artifact(artifacts["artifacts"], "delta", delta_location)
    unzip_artifact(
        artifacts["artifacts"], "changed_screenshots", "reference_test_screenshots"
    )

    # print the location of the delta as a link
    print(f"file://{delta_location}")


if __name__ == "__main__":
    main()
