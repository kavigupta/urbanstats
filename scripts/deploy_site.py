import argparse
import os
import shutil
import subprocess

PATH = "/home/kavi/temp/site"
LOCAL_REPO = "/home/kavi/urbanstats-site-backup/densitydb.github.io"
REPO = "git@github.com:densitydb/densitydb.github.io.git"


def synchronize():
    # pull the latest changes from the remote repo
    subprocess.run(["git", "pull", "origin", "main"], cwd=LOCAL_REPO, check=True)
    # copy the files from the local repo to the site folder, using rsync
    subprocess.run(
        [
            "rsync",
            "-a",
            "--info=progress2",
            LOCAL_REPO + "/",
            PATH,
            "--exclude",
            ".git",
        ],
        check=True,
    )


def update_scripts(branch):
    """
    Copy the files from the local repo to the site folder, then add a commit
    and push to the remote repo.
    """
    synchronize()
    # if the branch isn't the same as the current branch, checkout to the branch
    current_branch = get_current_branch()
    if current_branch != branch:
        # create a new branch if it doesn't exist
        subprocess.run(["git", "checkout", "-b", branch], cwd=PATH, check=True)
    # add the files to the git repo
    subprocess.run(["git", "add", "."], cwd=PATH, check=True)
    # commit the changes, using the commit message corresponding to the one in the local repo
    local_commit_message = subprocess.run(
        ["git", "log", "-1", "--pretty=%B"],
        cwd=LOCAL_REPO,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    subprocess.run(["git", "commit", "-m", local_commit_message], cwd=PATH, check=True)
    subprocess.run(["git", "push", "origin", branch], cwd=PATH, check=True)


def get_current_branch(path=PATH):
    current_branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=path,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()

    return current_branch


def update_all():
    temp_branch = "temp"
    push_to_new_branch(temp_branch)
    push_to_main(temp_branch)


def push_to_main(new_branch):
    current_branch = get_current_branch()
    assert current_branch == new_branch != "main", (current_branch, new_branch)
    # check if main branch exists
    branches = subprocess.run(
        ["git", "branch"], cwd=PATH, capture_output=True, text=True, check=True
    ).stdout.split("\n")
    branches = [x.strip().strip("*").strip() for x in branches]
    if "main" in branches:
        # checkout to main branch
        subprocess.run(["git", "checkout", "main"], cwd=PATH, check=True)
        # merge in the branch we were on
        subprocess.run(["git", "merge", new_branch], cwd=PATH, check=True)
    else:
        # add main branch
        subprocess.run(["git", "checkout", "-b", "main"], cwd=PATH, check=True)
    # force push to main
    subprocess.run(["git", "push", "-f", "origin", "main"], cwd=PATH, check=True)
    # remove temp branch
    subprocess.run(["git", "branch", "-D", new_branch], cwd=PATH, check=True)
    # push removal of temp branch
    subprocess.run(
        ["git", "push", "origin", "--delete", new_branch], cwd=PATH, check=True
    )


def push_to_new_branch(new_branch):
    shutil.rmtree(PATH, ignore_errors=True)
    # mkdir
    os.makedirs(PATH, exist_ok=True)
    synchronize()
    # initialize git
    subprocess.run(["git", "init"], cwd=PATH, check=True)
    # checkout to temp branch
    subprocess.run(["git", "checkout", "-b", new_branch], cwd=PATH, check=True)
    # add remote origin
    subprocess.run(["git", "remote", "add", "origin", REPO], cwd=PATH, check=True)
    # add several folders and push to main
    for folder, message in [
        ("shape", "shape"),
        ("order", "order"),
        ("data", "data"),
        (".", "rest"),
    ]:
        subprocess.run(["git", "add", folder], cwd=PATH, check=True)
        subprocess.run(["git", "commit", "-m", message], cwd=PATH, check=True)
        subprocess.run(
            ["git", "push", "-f", "origin", new_branch], cwd=PATH, check=True
        )


def merge(new_branch):
    current_branch = get_current_branch()
    assert current_branch == new_branch != "main", (current_branch, new_branch)
    # switch to main
    subprocess.run(["git", "checkout", "main"], cwd=PATH, check=True)
    # merge in the branch we were on
    subprocess.run(["git", "merge", new_branch], cwd=PATH, check=True)
    # push to main (no need to force push)
    subprocess.run(["git", "push", "origin", "main"], cwd=PATH, check=True)
    # remove temp branch
    subprocess.run(["git", "branch", "-D", new_branch], cwd=PATH, check=True)
    # push removal of temp branch
    subprocess.run(
        ["git", "push", "origin", "--delete", new_branch], cwd=PATH, check=True
    )


def rm_branch(branch):
    current_branch = get_current_branch()
    assert current_branch == branch != "main", (current_branch, branch)
    subprocess.run(["git", "checkout", "main"], cwd=PATH, check=True)
    subprocess.run(["git", "branch", "-D", branch], cwd=PATH, check=True)
    subprocess.run(["git", "push", "origin", "--delete", branch], cwd=PATH, check=True)


def main():
    p = argparse.ArgumentParser()
    # command update
    s = p.add_subparsers(dest="command")
    p_update = s.add_parser("update")
    p_update.add_argument("--target", choices=["scripts", "all"])
    p_update.add_argument("branch", type=str)
    # command push to new branch
    p_push_nb = s.add_parser("push-to-new-branch")
    p_push_nb.add_argument("branch", type=str)
    # command push to main
    p_push_m = s.add_parser("push-to-main")
    p_push_m.add_argument("branch", type=str)
    p_merge = s.add_parser("merge")
    p_merge.add_argument("branch", type=str)
    p_rm = s.add_parser("rm-branch")
    p_rm.add_argument("branch", type=str)
    args = p.parse_args()
    if args.command == "update":
        if args.target == "scripts":
            update_scripts(args.branch)
        elif args.target == "all":
            assert args.branch == "main"
            update_all()
    elif args.command == "push-to-new-branch":
        push_to_new_branch(args.branch)
    elif args.command == "push-to-main":
        push_to_main(args.branch)
    elif args.command == "merge":
        merge(args.branch)
    elif args.command == "rm-branch":
        rm_branch(args.branch)


if __name__ == "__main__":
    main()
