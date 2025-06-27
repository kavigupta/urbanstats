import re
import shutil
from pathlib import Path
from shlex import quote
from subprocess import PIPE, run

# Git repo must be manually initialized
# Use command `git clone --mirror https://github.com/densitydb/densitydb.github.io.git densitydb/densitydb.github.io`

bare_repo = Path(__file__).parent / "densitydb" / "densitydb.github.io"


def repo_path(branch, extension=""):
    path = Path(__file__).parent / "densitydb" / "repos"
    return path if branch is None else path / f"{branch}{extension}"


def clone(branch, dst):
    print(f"{branch}: Cloning new copy to {dst} ...")
    run(
        # If we don't quote here, someone could push a funky branch name and potentially RCE
        f"git clone --branch {quote(branch)} {quote(str(bare_repo))} {quote(str(dst))} 2>&1 | tr '\r' '\n'",
        check=True,
        shell=True,
        bufsize=0,
    )


def main():
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
        match.group(1)
        for match in re.finditer(r"^\*? {1,2}(.+)$", branches_output, re.M)
    ]
    print("Done")
    print("Current Branches", branches)

    def clean_branches():
        # Remove branches that no longer exist
        for branch_folder in repo_path(None).iterdir():
            if branch_folder.is_dir() and branch_folder.name not in branches:
                print(f"{branch_folder.name}: Does not exist on remote. Deleting...")
                shutil.rmtree(branch_folder)
                print(f"{branch_folder.name}: Done")

    # Useful to do this at the beginning in case there are leftovers from incomplete clones
    clean_branches()

    for branch in branches:
        if repo_path(branch).exists():
            print(f"{branch}: Exists.")
            current_head = run(
                ["git", "rev-parse", "HEAD"],
                cwd=repo_path(branch),
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
                clone(branch, repo_path(branch, ".cloning"))
                print(f"{branch}: Swapping current copy with cloned copy...")
                shutil.move(repo_path(branch), repo_path(branch, ".old"))
                shutil.move(repo_path(branch, ".cloning"), repo_path(branch))
                print(f"{branch}: Deleting old copy...")
                shutil.rmtree(repo_path(branch, ".old"))
                print(f"{branch}: Done")
            else:
                print(f"{branch}: heads same. Nothing to do")
        else:
            print(f"{branch}: Does not exist. Cloning...")
            clone(branch, repo_path(branch, ".cloning"))
            # Prevents the pipeline from trying to use it too early
            print(f"{branch}: Moving into place...")
            shutil.move(repo_path(branch, ".cloning"), repo_path(branch))
            print(f"{branch}: Done")

    clean_branches()


main()
