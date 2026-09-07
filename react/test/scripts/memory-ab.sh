#!/bin/bash
#
# Measures one memory test against two builds and prints what each retained.
#
# Usage, from react/:
#   test/scripts/memory-ab.sh <site-folder> <test> [baseline-ref] [head-ref]
#
# e.g. test/scripts/memory-ab.sh ~/densitydb.github.io memory_mapper_leak main
#
# Refs are built in throwaway worktrees; omitting head-ref builds the working tree.
# KEEP=1 leaves the builds and test logs behind.

set -e

if [ -z "$2" ]; then
    sed -n '3,11p' "$0" | cut -c 3-
    exit 1
fi

site=$(cd "$1" && pwd)
test_name=$2
base_ref=${3:-main}
head_ref=$4

react=$(cd "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d)
server=

# TestCafe wants a consecutive pair, and its default 1337 is often taken
free_port() {
    node -e '
        const net = require("net")
        const bind = port => new Promise(resolve => {
            const s = net.createServer()
            s.once("error", () => { resolve(undefined) })
            s.listen(port, () => { resolve(s) })
        })
        const count = Number(process.argv[1] || 1)
        void (async () => {
            for (;;) {
                const base = 20000 + Math.floor(Math.random() * 40000)
                const servers = []
                for (let i = 0; i < count; i++) {
                    servers.push(await bind(base + i))
                }
                await Promise.all(servers.filter(s => s).map(s => new Promise(r => { s.close(r) })))
                if (servers.every(s => s)) {
                    console.log(base)
                    return
                }
            }
        })()
    ' "$1"
}

# Cheap where the filesystem can clone or reflink, a real copy where it can't
copy_tree() {
    cp -Rc "$1" "$2" 2>/dev/null || cp -R --reflink=auto "$1" "$2" 2>/dev/null || cp -R "$1" "$2"
}

cleanup() {
    [ -n "$server" ] && kill "$server" 2>/dev/null
    if [ -n "$KEEP" ]; then echo "kept $work" >&2; else rm -rf "$work"; fi
    git -C "$react" worktree prune
}
trap cleanup EXIT

# Building the working tree in place would fight the dev server over ../dist
build() {
    local ref=$1 out=$2 src=$react
    if [ -n "$ref" ]; then
        git -C "$react" worktree add --detach "$work/src-$out" "$ref" >/dev/null 2>&1
        # A copy, not a symlink: rspack resolves through symlinks, and the real path then misses
        # the config's `exclude` for maplibre-gl, which builds it differently from the CI's bundle
        copy_tree "$react/node_modules" "$work/src-$out/react/node_modules"
        src=$work/src-$out/react
    fi
    if ! (cd "$src" && NODE_ENV=production npx rspack --mode=production --output-path "$work/$out" >"$work/$out.build.log" 2>&1); then
        tail -20 "$work/$out.build.log"
        exit 1
    fi
}

measure() {
    local out=$1 port attempt
    port=$(free_port)
    node "$react/test/scripts/memory-ab-serve.mjs" "$work/$out" "$site" "$port" &
    server=$!
    sleep 2
    # memoryUsage attaches to every CDP target, and the USS worker's idle timer can take one out
    # from under it, so a run that reaches no measurement at all is worth repeating
    for attempt in 1 2 3; do
        # amd64: an arm64 container reports numbers that don't track the amd64 ones CI asserts against
        (cd "$react" && PORT=$port TESTCAFE_PORT=$(free_port 2) npm run test:e2e -- "--test=test/$test_name.test.ts" --docker=ci --browser=chromium) \
            >"$work/$out.test.$attempt.log" 2>&1 || true
        if grep -o 'bytes: [0-9]*' "$work/$out.test.$attempt.log" | tail -1 | grep -o '[0-9]*'; then
            kill "$server" 2>/dev/null || true
            server=
            return
        fi
    done
    kill "$server" 2>/dev/null || true
    server=
    cp "$work/$out.test.3.log" "/tmp/memory-ab-$out.log"
    echo "no measurement after 3 attempts; see /tmp/memory-ab-$out.log" >&2
    exit 1
}

echo "building $base_ref..." >&2
build "$base_ref" base
echo "building ${head_ref:-working tree}..." >&2
build "$head_ref" head

echo "measuring $base_ref..." >&2
base_bytes=$(measure base)
echo "measuring ${head_ref:-working tree}..." >&2
head_bytes=$(measure head)

printf '\n%-24s %12s\n' "$base_ref" "$base_bytes"
printf '%-24s %12s\n' "${head_ref:-working tree}" "$head_bytes"
printf '%-24s %12s\n' delta "$((head_bytes - base_bytes))"
