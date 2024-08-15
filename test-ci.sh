#!/bin/bash
# You probably want to update test.sh as well

set -e

echo "GITHUB_WORKSPACE $GITHUB_WORKSPACE"

cd /density-db
git checkout origin
git checkout origin/$BRANCH_NAME || true # Checkout the same branch name on the remote, if it exists. BRANCH_NAME defined in workflow env

python3 -m http.server &

cd $GITHUB_WORKSPACE
python3 create_website.py /density-db --no-data --no-geo --no-juxta

# Start display subsystem to browser can run
Xvfb :10 -ac &
export DISPLAY=:10
fluxbox >/dev/null 2>&1 & # needed for window resizing in Testcafe

cd react

for test_file in test/*_test.js ; do
    npx testcafe -e chromium $test_file
done
