import os
import subprocess
from tempfile import NamedTemporaryFile

import requests

with open(os.path.expanduser("~/.github-token"), "r") as token:
    GITHUB_TOKEN = token.read().strip()

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "kavigupta/urbanstats"


def get_current_branch(path):
    current_branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=path,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()

    return current_branch


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
    current_branch = get_current_branch(path=REPO_ROOT)
    for pr in pull_requests():
        if pr["head"]["ref"] == current_branch:
            # print out the pull request url
            print(pr["html_url"])
            return pr
    return None


def get_current_pr_label() -> str:
    """
    Build a label like 'PR title (#1234)' for the current pull request.
    """
    pr = pull_request_for_current_branch()
    if pr is None:
        raise SystemExit("No open pull request found for the current branch.")
    title = pr.get("title", "").strip()
    number = pr.get("number")
    if not title or number is None:
        raise SystemExit("Could not determine PR title/number from GitHub.")
    return f"{title} (#{number})"


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
        raise RuntimeError("No actions found for PR: " + pr["html_url"])
    run = runs[0]
    if run["status"] != "completed":
        raise RuntimeError("Action is not completed")
    return run


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
    artifacts = [a for a in artifacts if a["name"] == key]
    if not artifacts:
        print(f"Artifact {key} not found")
        return
    artifact = artifacts[0]
    url = artifact["archive_download_url"]
    with NamedTemporaryFile(suffix=".zip") as f:
        response = requests.get(url, headers={"Authorization": f"token {GITHUB_TOKEN}"})
        response.raise_for_status()
        f.write(response.content)
        f.flush()
        os.system(f"unzip -d {path} {f.name}")
