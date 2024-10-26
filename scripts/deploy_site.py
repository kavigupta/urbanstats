import os
import shutil
import subprocess

PATH = "/home/kavi/temp/site"
LOCAL_REPO = "/home/kavi/urbanstats-site-backup/densitydb.github.io"
REPO = "git@github.com:densitydb/densitydb.github.io.git"


def synchronize():
    # pull the latest changes from the remote repo
    subprocess.run(["git", "pull", "origin", "master"], cwd=LOCAL_REPO, check=True)
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
    current_branch = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        cwd=PATH,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if current_branch != branch:
        # create a new branch if it doesn't exist
        subprocess.run(["git", "checkout", "-b", branch], cwd=PATH)
    # add the files to the git repo
    subprocess.run(["git", "add", "."], cwd=PATH)
    # commit the changes, using the commit message corresponding to the one in the local repo
    local_commit_message = subprocess.run(
        ["git", "log", "-1", "--pretty=%B"],
        cwd=LOCAL_REPO,
        capture_output=True,
        text=True,
    ).stdout.strip()
    subprocess.run(["git", "commit", "-m", local_commit_message], cwd=PATH)
    subprocess.run(["git", "push", "origin", branch], cwd=PATH)


def update_all():
    temp_branch = "temp"
    push_to_new_branch(temp_branch)
    push_to_master(temp_branch)


def push_to_master(new_branch):
    # add master branch
    subprocess.run(["git", "checkout", "-b", "master"], cwd=PATH)
    # force push to master
    subprocess.run(["git", "push", "-f", "origin", "master"], cwd=PATH)
    # remove temp branch
    subprocess.run(["git", "branch", "-D", new_branch], cwd=PATH)
    # push removal of temp branch
    subprocess.run(["git", "push", "origin", "--delete", new_branch], cwd=PATH)


def push_to_new_branch(new_branch):
    shutil.rmtree(PATH, ignore_errors=True)
    # mkdir
    os.makedirs(PATH, exist_ok=True)
    synchronize()
    # initialize git
    subprocess.run(["git", "init"], cwd=PATH)
    # checkout to temp branch
    subprocess.run(["git", "checkout", "-b", new_branch], cwd=PATH)
    # add remote origin
    subprocess.run(["git", "remote", "add", "origin", REPO], cwd=PATH)
    # add several folders and push to master
    for folder, message in [
        ("shape", "shape"),
        ("order", "order"),
        ("data", "data"),
        (".", "rest"),
    ]:
        subprocess.run(["git", "add", folder], cwd=PATH)
        subprocess.run(["git", "commit", "-m", message], cwd=PATH)
        subprocess.run(["git", "push", "-f", "origin", new_branch], cwd=PATH)


def main():
    import argparse

    p = argparse.ArgumentParser()
    # command update
    s = p.add_subparsers(dest="command")
    p_update = s.add_parser("update")
    p_update.add_argument("--target", choices=["scripts", "all"])
    p_update.add_argument("branch", type=str)
    # command push to new branch
    p_push_nb = s.add_parser("push-to-new-branch")
    p_push_nb.add_argument("branch", type=str)
    # command push to master
    p_push_m = s.add_parser("push-to-master")
    p_push_m.add_argument("branch", type=str)
    args = p.parse_args()
    if args.command == "update":
        if args.target == "scripts":
            update_scripts(args.branch)
        elif args.target == "all":
            assert args.branch == "master"
            update_all()
    elif args.command == "push-to-new-branch":
        push_to_new_branch(args.branch)
    elif args.command == "push-to-master":
        push_to_master(args.branch)


if __name__ == "__main__":
    main()
