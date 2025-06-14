import os
import sys
from time import sleep

import requests


def ci_proxy_origin(branch):
    return f"http://{branch}.staging.urbanstats.org"


# Resolves an urbanstats branch name into what branch CI should run against in densitydb
# and waits for the CI proxy to be ready with the current version of that branch

urbanstats_branch_name = os.getenv("URBANSTATS_BRANCH_NAME")
if not urbanstats_branch_name:
    raise ValueError("Environment variable 'URBANSTATS_BRANCH_NAME' is not set.")

github_token = os.getenv("GITHUB_TOKEN")
if not github_token:
    raise ValueError("Environment variable 'GITHUB_TOKEN' is not set.")

densitydb_branch = None

while True:
    # Example Response:
    # [
    #   {
    #     "name": "master",
    #     "commit": {
    #       "sha": "49a740f0c50338371b6d94adf0569efd1834c0b2",
    #       "url": "https://api.github.com/repos/densitydb/densitydb.github.io/commits/49a740f0c50338371b6d94adf0569efd1834c0b2"
    #     },
    #     "protected": false
    #   },
    #   ...
    # ]
    # Need to continually do this query or we can have a race where the ci proxy overtakes our last check of the origin branches
    branches = requests.get(
        "https://api.github.com/repos/densitydb/densitydb.github.io/branches",
        headers={"Authorization": f"Bearer {github_token}"},
    ).json()

    # If branch name matches, pick that branch, otherwise pick master
    densitydb_branch = next(
        (branch for branch in branches if branch["name"] == urbanstats_branch_name),
        next(branch for branch in branches if branch["name"] == "master"),
    )

    # Must print to error to not corrupt the output
    print(f"Using branch {densitydb_branch['name']}...", file=sys.stderr)

    request_url = f"{ci_proxy_origin(densitydb_branch['name'])}/.git/refs/heads/{densitydb_branch['name']}"
    response = requests.get(request_url)
    if response.status_code != 200:
        print(
            f"Status code from CI proxy for {request_url}: {response.status_code}",
            file=sys.stderr,
        )
        sleep(10)
        continue
    ci_proxy_hash = response.text.strip()
    if ci_proxy_hash != densitydb_branch["commit"]["sha"]:
        print(
            f"HEADs not equal: origin={densitydb_branch['commit']['sha']} ci_proxy={ci_proxy_hash}",
            file=sys.stderr,
        )
        sleep(10)
        continue

    print(
        f"HEADs equal! origin={densitydb_branch['commit']['sha']} ci_proxy={ci_proxy_hash}",
        file=sys.stderr,
    )
    break

print(f"ci-proxy-origin={ci_proxy_origin(densitydb_branch['name'])}")
