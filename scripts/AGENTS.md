# Working on a stacked chain of PRs

A large change is sometimes split into a chain of branches, each based on the one below it
and each with its own PR: `01-foo` off `main`, `02-bar` off `01-foo`, and so on. GitHub
retargets a PR to `main` automatically when its base branch merges, as long as the repo
deletes branches on merge — which this one does.

## Rules

**Merge up the chain, never rebase it.** Rebasing rewrites every branch above the one you
touched, which needs a force push, which drops the line comments reviewers have already left.
Merging keeps every push a fast-forward.

**A fix belongs in the lowest branch that has the problem**, then gets merged upwards. Fixing
it separately on each branch produces conflicts at every level.

**Every branch has to pass CI on its own**, because each one is reviewed and merged
separately. In particular `npm run unused-exports` runs `knip --include exports`, which fails
on an exported symbol nothing imports — so a branch cannot widen a symbol's visibility for the
benefit of a later branch. Export it in the branch that first consumes it.

## The script

`scripts/propagate-stack.sh` does the merging. It takes the local branches matching
`[0-9][0-9]-*` in name order and merges each into the next.

```bash
scripts/propagate-stack.sh                     # merge up the stack
scripts/propagate-stack.sh --from origin/main  # merge main into the bottom branch first
scripts/propagate-stack.sh --check             # tsc, knip and lint each branch
scripts/propagate-stack.sh --push              # push every branch afterwards
scripts/propagate-stack.sh --pattern 'feat-*'  # a differently named chain
```

Re-running is how you recover from a conflict: merges that already happened report "Already
up to date", so resolve the conflict, `git add -A && git commit --no-edit`, and run the script
again to continue from where it stopped. It leaves you on the branch that failed; otherwise it
returns you to the branch you started on.

`--check` is worth running before `--push`. An intermediate branch can typecheck on its own
but break once the branch below it changes, and CI will only tell you that one branch at a
time.

Screenshot tests are a separate matter: a visual change low in the stack invalidates the
reference screenshots for every branch above it. Regenerate them through CI's
`!updateScreenshots` command rather than locally.
