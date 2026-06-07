#!/bin/bash

set -e

cd ..
python create_website.py --mode dev --target scripts --site-folder $1
cd react

while true; do
    rspack serve --mode=development --watch --env directory=$1
    echo 'Restarting watcher... Press ^C again to stop watching.'
    sleep 1
done
