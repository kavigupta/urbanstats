#!/bin/bash

# Resets the site repository served by this checkout's `npm run watch` to origin/main,
# if it's behind, and waits for the watcher to rebuild.

set -e

cd "$(dirname "$0")"
react_dir=$(pwd -P)

for pid in $(pgrep -f '^/bin/bash ./watch.sh '); do
    # Skip the subshells running log_tail.
    ps -o args= -p $(ps -o ppid= -p $pid) | grep -q watch.sh && continue
    if [ "$(lsof -a -p $pid -d cwd -Fn | grep '^n' | cut -c2-)" = "$react_dir" ]; then
        watcher=$pid
        site=$(ps -o args= -p $pid | sed 's/.*watch\.sh //')
    fi
done

if [ -z "$site" ]; then
    echo "No watch.sh is running from $react_dir" >&2
    exit 1
fi

git -C "$site" fetch origin main
if [ "$(git -C "$site" rev-parse HEAD)" = "$(git -C "$site" rev-parse origin/main)" ]; then
    echo "$site is up to date"
    exit 0
fi

git -C "$site" reset --hard origin/main

rspack=$(pgrep -P $watcher rspack-node)
kill $rspack
while kill -0 $rspack 2>/dev/null; do sleep 1; done
rm -f dev-server.log

echo "Waiting for $site to rebuild..."
until grep -qs 'Rspack compiled' dev-server.log; do
    kill -0 $watcher 2>/dev/null || { echo "watch.sh exited" >&2; exit 1; }
    sleep 2
done
grep 'Rspack compiled' dev-server.log
