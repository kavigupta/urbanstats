#!/bin/bash
# Propagate commits up a stacked-PR chain: merge each branch into the one above it, so a fix
# made low in the stack reaches every branch built on top of it.
#
# The stack is the local branches matching --pattern, in name order (01-foo, 02-bar, ...).
# Merging rather than rebasing means the pushes stay fast-forward, so review threads on the
# PRs survive.
#
# Re-running is safe: merges that already happened report "Already up to date", and --check
# rechecks a branch only if its contents changed. So after resolving a conflict, commit it and
# run the script again to pick up where it stopped.
#
#   scripts/propagate-stack.sh                   # merge up the stack
#   scripts/propagate-stack.sh --from origin/main  # merge main into the bottom branch first
#   scripts/propagate-stack.sh --check           # typecheck, knip and lint each branch
#   scripts/propagate-stack.sh --push            # push every branch afterwards

set -uo pipefail

# The re-run command printed on a conflict. Absolute, because it is run from a branch that
# may predate this script, and re-quoted, so an argument the shell would glob-expand survives
# the copy-paste.
self="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
rerun=$(printf '%q ' "$self" "$@")
rerun=${rerun% }

pattern='[0-9][0-9]-*'
base=''
check=false
push=false

while [ $# -gt 0 ]; do
    case "$1" in
        --from) base="$2"; shift 2 ;;
        --pattern) pattern="$2"; shift 2 ;;
        --check) check=true; shift ;;
        --push) push=true; shift ;;
        --help|-h) awk 'NR > 1 && /^#/ { sub(/^# ?/, ""); print; next } NR > 1 { exit }' "$0"; exit 0 ;;
        *) echo "unknown argument: $1" >&2; exit 2 ;;
    esac
done

cd "$(git rev-parse --show-toplevel)" || exit 1

if [ -e "$(git rev-parse --git-dir)/MERGE_HEAD" ]; then
    echo "A merge is already in progress. Finish or abort it first." >&2
    exit 1
fi

# Untracked files are left alone by checkout and merge, so they don't block us.
if [ -n "$(git status --porcelain -uno)" ]; then
    echo "You have uncommitted changes to tracked files. Commit or stash first." >&2
    exit 1
fi

branches=$(git branch --list "$pattern" --sort=refname --format='%(refname:short)')

if [ -z "$branches" ]; then
    echo "No branches match '$pattern'." >&2
    exit 1
fi

original=$(git rev-parse --abbrev-ref HEAD)
trap 'git checkout -q "$original"' EXIT

# Each branch's checks must pass on its own, since each is reviewed and merged separately.
run_checks() {
    (
        cd react || exit 1
        ./node_modules/.bin/tsc --noEmit -p tsconfig.json &&
            npm run --silent unused-exports &&
            npm run --silent lint:ci
    )
}

# Trees that have already passed, so a re-run after a conflict doesn't recheck the branches
# below it. Keyed by tree rather than commit, because the checks only look at the worktree.
checked="$(git rev-parse --git-dir)/propagate-stack-checked"

prev="$base"

while read -r branch; do
    if [ -n "$prev" ]; then
        echo "==> merging $prev into $branch"
        git checkout -q "$branch" || exit 1
        if ! git merge --no-edit "$prev"; then
            cat >&2 <<MSG

Conflict merging $prev into $branch. Resolve it, then:

    git add -A && git commit --no-edit
    $rerun

The re-run starts from the bottom again, but the work below here is already done.
MSG
            trap - EXIT
            exit 1
        fi
    fi

    if $check; then
        git checkout -q "$branch" || exit 1
        tree=$(git rev-parse HEAD^{tree})
        if grep -qxF "$tree" "$checked" 2>/dev/null; then
            echo "==> $branch unchanged since it last passed, skipping checks"
        else
            echo "==> checking $branch"
            if ! run_checks; then
                echo "Checks failed on $branch." >&2
                trap - EXIT
                exit 1
            fi
            echo "$tree" >> "$checked"
        fi
    fi

    prev="$branch"
done <<< "$branches"

if $push; then
    echo "==> pushing"
    # --atomic, so a rejection leaves every branch unpushed rather than half the stack.
    git push --atomic origin $branches || exit 1
fi

echo "==> done"
