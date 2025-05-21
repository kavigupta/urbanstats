import re
import shutil
from pathlib import Path
from subprocess import PIPE, run

# Git repo must be manually initialized
# Use command `git clone --mirror https://github.com/densitydb/densitydb.github.io.git densitydb/densitydb.github.io`

bare_repo = Path(__file__).parent / "densitydb" / "densitydb.github.io"


def repo_path(for_branch=None):
    path = Path(__file__).parent / "densitydb" / "repos"
    return path if for_branch is None else path / for_branch


print("Updating and pruning from remotes...")
run(["git", "remote", "update", "--prune"], cwd=bare_repo, check=True)
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
            run(
                ["git", "clone", "--branch", branch, str(bare_repo), str(branch_path)],
                check=True,
            )
            print(f"{branch}: Done")
        else:
            print(f"{branch}: heads same. Nothing to do")
    else:
        print(f"{branch}: Does not exist. Cloning...")
        run(
            ["git", "clone", "--branch", branch, str(bare_repo), str(branch_path)],
            check=True,
        )
        print(f"{branch}: Done")

# Remove branches that no longer exist
for branch_folder in repo_path().iterdir():
    if branch_folder.is_dir() and branch_folder.name not in branches:
        print(f"{branch_folder.name}: Does not exist on remote. Deleting...")
        shutil.rmtree(branch_folder)
        print(f"{branch_folder.name}: Done")
