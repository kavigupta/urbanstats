# ci_proxy server

This mini-app is used to run e2e tests in the Urban Stats CI.

Urban Stats needs a big data repo to run against, which is impractical to check out with each test.

Github was rate limiting requests against it.

## Architecture

A server runs two components:

- `sync.py` This syncs the `densitydb/repos/*` directory to be a checked out copy of the data repo for each branch on the remote. It stores a centralized bare repo in `densitydb/densitydb.github.io`, which is the remote for the `densitydb/repos/*` repos.
  - This is scheduled as a systemd service that runs over and over again.
- `nginx` Uses the configuration in `default` to serve the files in `densitydb/repos/*`. Translates the `x-branch` header into the appropriate branch (or `master`) if absent.
  - We use `nginx` because it performs very well, when running lots of CI jobs there can be quite a bit of demand.

## Installation

Clone this repo.

Run `./install.sh` in this folder. Assumes root user. Tested on Ubuntu 24.04
