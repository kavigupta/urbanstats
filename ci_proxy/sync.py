import re
import shutil
from pathlib import Path
from subprocess import PIPE, run
from shlex import quote

# Git repo must be manually initialized
# Use command `git clone --mirror https://github.com/densitydb/densitydb.github.io.git densitydb/densitydb.github.io`

bare_repo = Path(__file__).parent / "densitydb" / "densitydb.github.io"


def repo_path(for_branch=None):
    path = Path(__file__).parent / "densitydb" / "repos"
    return path if for_branch is None else path / for_branch


def clone(clone_branch):
    run(
        # If we don't quote here, someone could push a funky branch name and potentially RCE
        f"git clone --branch {quote(clone_branch)} {quote(str(bare_repo))} {quote(str(repo_path(clone_branch)))} 2>&1 | tr '\r' '\n'",
        check=True,
        shell=True,
        bufsize=0,
    )


print("Updating and pruning from remotes...")
run(
    # Replace returns so we can see output in logs
    "git remote update --prune 2>&1 | tr '\r' '\n'",
    cwd=bare_repo,
    check=True,
    shell=True,
    bufsize=0,
)
branches_output = run(
    ["git", "branch"], cwd=bare_repo, stdout=PIPE, text=True, check=True
).stdout
branches = [
    match.group(1) for match in re.finditer(r"^\*? {1,2}(.+)$", branches_output, re.M)
]
print("Done")
print("Current Branches", branches)

for branch in branches:
    branch_path = repo_path(branch)
    if branch_path.exists():
        print(f"{branch}: Exists.")
        current_head = run(
            ["git", "rev-parse", "HEAD"],
            cwd=branch_path,
            stdout=PIPE,
            text=True,
            check=True,
        ).stdout.strip()
        origin_head = run(
            ["git", "rev-parse", branch],
            cwd=bare_repo,
            stdout=PIPE,
            text=True,
            check=True,
        ).stdout.strip()
        print(f"{branch}: current_head={current_head} origin_head={origin_head}")
        if current_head != origin_head:
            print(f"{branch}: heads different.")
            print(f"{branch}: Deleting {branch_path} ...")
            shutil.rmtree(branch_path)
            print(f"{branch}: Cloning new copy to {branch_path} ...")
            clone(branch)
            print(f"{branch}: Done")
        else:
            print(f"{branch}: heads same. Nothing to do")
    else:
        print(f"{branch}: Does not exist. Cloning...")
        clone(branch)
        print(f"{branch}: Done")

# Remove branches that no longer exist
for branch_folder in repo_path().iterdir():
    if branch_folder.is_dir() and branch_folder.name not in branches:
        print(f"{branch_folder.name}: Does not exist on remote. Deleting...")
        shutil.rmtree(branch_folder)
        print(f"{branch_folder.name}: Done")
