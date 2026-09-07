# Memory tests

`memory_*.test.ts` assert a ceiling on the heap a page still holds after some navigation.
`memoryUsage` prints the CDP target table it added up, so every run leaves a `bytes:` line in
the log whether or not the assertion passed.

Read that number rather than pass/fail. A local run sits well above CI's — 77MB against CI's
64.5MB for the same commit — because CI proxies the deployed data and a local site folder is
its own `--mode dev` build, so the ceiling fails locally either way. Only the delta between
two builds measured the same way means anything.

Two things have to match CI or the delta disappears:

- **`--docker=ci`.** A 12.7MB regression measured 77.3MB on both sides under `--docker=host-arch`
  and 77.1MB against 89.9MB under `ci`. Whatever `arm64` does differently, it hides the leak.
- **A production bundle.** The dev server's reads about 9MB heavier.

`test/scripts/memory-ab.sh` does both, for two refs:

```
test/scripts/memory-ab.sh ~/densitydb.github.io memory_mapper_leak main my-branch
```

It builds each ref in a throwaway worktree, serves the bundle over the site folder the way
`create_website.py --target scripts` would have, and prints both numbers and the delta. The last
argument is optional and defaults to the working tree. It picks its own ports, so it neither
collides with a dev server nor needs `direnv exec .`.

To see what CI measured, the `bytes:` line is in the job log:

```
gh run view <run-id> --job <job-id> --log > /tmp/job.log
grep -n 'bytes:' /tmp/job.log
```

Worth pulling the same line from a few recent `main` runs before treating a number as a
regression: the ceilings are tight, and `memory_mapper_leak` has sat at 64.5MB under a 65MB
limit.

To tell a leak from a page that is simply bigger now, delete the navigation the test does
before the assertion and measure both refs again. A delta that survives that is steady-state
growth, not something the page failed to release.

`Error: No target with given id found` is a flake, not a result: `memoryUsage` attaches to every
target in turn, and the USS worker's 10s idle timer can retire one mid-enumeration. Run it again.
