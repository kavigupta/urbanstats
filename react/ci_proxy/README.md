# ci_proxy

This mini-app is used to run e2e tests in the Urban Stats CI.

Urban Stats needs a big data repo to run against, which is impractical to check out with each test.

Github was rate limiting requests against it.

## Architecture

A server runs two components:

- `main.ts` This keeps the `densitydb/repos/*` directory up-to-date with a checked out copy of the data repo for each branch on the remote. It stores a centralized bar repo in `densitydb/densitydb.github.io`, which is the remote for the `densitydb/repos/*` repos.
- `nginx` Uses the configuration in `default` to serve the files in `densitydb/repos/*`. Translates the `x-branch` header into the appropriate branch (or `master`) if absent.
  - We use `nginx` because it performs very well, when running lots of CI jobs there can be quite a bit of demand.
  - This also means you can restart `main.ts` without interrupting ongoing CI jobs.
