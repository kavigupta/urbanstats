#!/bin/bash

set -e

cd ..
python create_website.py --mode dev --target scripts --site-folder $1
cd react

# Copy the watcher's output to dev-server.log so that it can be read after the
# fact, without the color escapes. Once the log reaches max lines, drop all but
# the last keep lines.
log_tail() {
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
