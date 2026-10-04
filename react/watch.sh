#!/bin/bash

set -e

cd ..
python create_website.py --mode dev --target scripts --site-folder $1
cd react

# Mirrors output to dev-server.log without color escapes, trimmed to the last
# `keep` lines once it reaches `max`.
log_tail() {
    # ^C reaches the whole pipeline. Ignoring it lets awk drain rspack's last
    # output and keeps the exit status off 130, which would end this script.
    trap '' INT
    awk -v f=dev-server.log -v max=4000 -v keep=2000 '
        BEGIN { ansi = sprintf("%c", 27) "\\[[0-9;?]*[a-zA-Z]" }
        { print; fflush(); line = $0; gsub(ansi, "", line)
          print line > f; fflush(f); buf[++n] = line }
        n >= max {
            close(f)
            for (i = n - keep + 1; i <= n; i++) print buf[i] > f
            for (i = 1; i <= keep; i++) buf[i] = buf[n - keep + i]
            for (i = keep + 1; i <= n; i++) delete buf[i]
            n = keep
        }
    '
}

while true; do
    FORCE_COLOR=1 rspack serve --mode=development --watch --env directory=$1 2>&1 | log_tail
    echo 'Restarting watcher... Press ^C again to stop watching.'
    sleep 1
done
