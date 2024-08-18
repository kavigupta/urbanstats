import os
import shutil
import subprocess

PATH = "/home/kavi/temp/site"
LOCAL_REPO = "/home/kavi/urbanstats-site-backup/densitydb.github.io"
REPO = "git@github.com:densitydb/densitydb.github.io.git"

temp_branch = "temp"


def update_scripts():
    """
    Copy the files from the local repo to the site folder, then add a commit
    and push to the remote repo.
    """
    # pull the latest changes from the remote repo
    subprocess.run(["git", "pull", "origin", "master"], cwd=LOCAL_REPO, check=True)
    # copy the files from the local repo to the site folder, using rsync
    subprocess.run(
        ["rsync", "-a", "--info=progress2", LOCAL_REPO + "/", PATH, "--exclude", ".git"], check=True
    )
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
    subprocess.run(["git", "push", "origin", "master"], cwd=PATH)


def update_all():
    # remove .git folder
    shutil.rmtree(os.path.join(PATH, ".git"), ignore_errors=True)
    # initialize git
    subprocess.run(["git", "init"], cwd=PATH)
    # checkout to temp branch
    subprocess.run(["git", "checkout", "-b", temp_branch], cwd=PATH)
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
        subprocess.run(["git", "push", "-f", "origin", temp_branch], cwd=PATH)
    # add master branch
    subprocess.run(["git", "checkout", "-b", "master"], cwd=PATH)
    # force push to master
    subprocess.run(["git", "push", "-f", "origin", "master"], cwd=PATH)
    # remove temp branch
    subprocess.run(["git", "branch", "-D", temp_branch], cwd=PATH)
    # push removal of temp branch
    subprocess.run(["git", "push", "origin", "--delete", temp_branch], cwd=PATH)

def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--target", choices=["scripts", "all"], required=True)
    args = p.parse_args()
    if args.target == "scripts":
        update_scripts()
    elif args.target == "all":
        update_all()

if __name__ == "__main__":
    main()
