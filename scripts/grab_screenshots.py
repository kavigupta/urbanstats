import os
import subprocess
import sys
from tempfile import NamedTemporaryFile

import requests

location = os.path.join(os.path.dirname(__file__), "..")
sys.path.append(location)

from scripts.deploy_site import get_current_branch

with open(os.path.expanduser("~/.github-token"), "r") as f:
    GITHUB_TOKEN = f.read().strip()

REPO = "kavigupta/urbanstats"


def pull_requests():
    """
    Get a list of pull requests from the GitHub API.
    """
    response = requests.get(
        f"https://api.github.com/repos/{REPO}/pulls",
        headers={
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
        },
    )
    response.raise_for_status()
    data = response.json()
    return data


def pull_request_for_current_branch():
    """
    Get the pull request for the current branch.
    """
    current_branch = get_current_branch(path=location)
    for pr in pull_requests():
        if pr["head"]["ref"] == current_branch:
            # print out the pull request url
            print(pr["html_url"])
            return pr
    return None


def get_action(pr):
    """
    Get the actions on the repository
    """
    response = requests.get(
        f"https://api.github.com/repos/{REPO}/actions/runs",
        headers={
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
        },
        params={"head_sha": pr["head"]["sha"]},
    )
    response.raise_for_status()
    data = response.json()
    runs = data["workflow_runs"]
    assert len(runs) <= 1, "More than one action found (?)"
    if len(runs) == 0:
        raise Exception("No actions found for PR: " + pr["html_url"])
    return runs[0]


def get_artifacts(action):
    """
    Get the artifacts for the action.
    """
    response = requests.get(
        f"https://api.github.com/repos/{REPO}/actions/runs/{action['id']}/artifacts",
        headers={
            "Authorization": f"token {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
        },
    )
    response.raise_for_status()
    data = response.json()
    return data


def unzip_artifact(artifacts, key, path):
    """
    Locate the artifact with the given key and unzip it to the given path.

    Merge the contents of the artifact with the given key into the given path.
    """
    [artifact] = [a for a in artifacts if a["name"] == key]
    url = artifact["archive_download_url"]
    with NamedTemporaryFile(suffix=".zip") as f:
        response = requests.get(url, headers={"Authorization": f"token {GITHUB_TOKEN}"})
        response.raise_for_status()
        f.write(response.content)
        f.flush()
        os.system(f"unzip -d {path} {f.name}")


def main():
    pr = pull_request_for_current_branch()
    act = get_action(pr)
    artifacts = get_artifacts(act)

    delta_location = os.path.expanduser("~/Downloads/temp/delta")

    # delete and recreate the delta location
    subprocess.run(["rm", "-rf", delta_location])
    os.makedirs(delta_location)

    unzip_artifact(artifacts["artifacts"], "delta", delta_location)
    unzip_artifact(
        artifacts["artifacts"], "changed_screenshots", "reference_test_screenshots"
    )

    # print the location of the delta as a link
    print(f"file://{delta_location}")


if __name__ == "__main__":
    main()
