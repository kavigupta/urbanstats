#!/bin/bash

set -e

# fnm
FNM_PATH="/root/.local/share/fnm"
if [ -d "$FNM_PATH" ]; then
  export PATH="$FNM_PATH:$PATH"
  eval "`fnm env --shell bash`"
fi

cd /root/urbanstats/react/ci_proxy

npx tsx sync.ts