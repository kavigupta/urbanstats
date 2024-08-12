#!/bin/bash
# You probably want to update test.sh as well

set -e

# env:
# BRANCH_NAME: ${{ github.head_ref || github.ref_name }} 

pushd ../density-db
git fetch --depth 1 origin # cloned in docker
git checkout origin
git checkout origin/$BRANCH_NAME || true # Checkout the same branch name on the remote, if it exists

python3 -m http.server &

popd
python3 create_website.py ../density-db --no-data --no-geo --no-juxta

# Start display subsystem to browser can run
Xvfb :10 -ac &
export DISPLAY=:10

cd react

for browser in path:$(which firefox-nightly) ; do
    for test_file in test/*_test.js ; do
        npx testcafe -e $browser $test_file
    done
done

cd ..

python3 tests/check_images.py