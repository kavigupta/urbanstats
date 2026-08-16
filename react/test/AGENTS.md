# Running the e2e tests

Run from `react/`:

```
direnv exec . npm run test:e2e -- '--test=test/checkbox_bug.test.ts' > /tmp/e2e.log 2>&1
```

That's the whole thing. In particular:

- **Assume a dev server is already running, and don't start one.** The test runner
  doesn't start or manage it. If nothing is serving the site, ask rather than
  starting your own — `npm run watch` needs the path to the site repository, which
  you have no way to guess.
- `--test` is required. It may be a glob (`'test/mapper-*.test.ts'`); quote it so the
  shell doesn't expand it first. To narrow further, use `test.only` inside the test file.
- Don't run the whole suite. The runner works through the matched files one at a
  time, whereas CI gives each file its own job — leave it to CI.
- **Redirect to a file, as above, rather than piping through `head`, `tail`, or `grep`.**
  Runs take minutes and produce a lot of log, and a run you truncate is a run you have to
  do again. With the whole thing on disk, narrowing down costs nothing:

  ```
  grep -n failed /tmp/e2e.log
  ```

  A `PreToolUse` hook in [`.claude/settings.json`](../../.claude/settings.json) rejects
  the piped form.

## The embed Worker tests

These are the exception to the rule above: they need a second server, the embed Worker, and they
start it themselves.

- `embed_worker.test.ts` reuses a Worker already listening on 8787 and otherwise starts one, taking
  it down with the runner. Starting your own first with `npm run og-preview` saves the wait.
- `embed_worker_resources.test.ts` has to run by itself, with nothing on 8787 — it refuses to start
  otherwise. Measuring a render deadlocks workerd's inspector, so the Worker it starts is unusable
  afterwards. Make sure it is gone before running anything else against 8787.
- The card screenshots are the Worker's PNG itself, drawn from the vector tiles snapshotted in
  `test/assets/og-tiles` rather than from openfreemap, so openfreemap's next planet build cannot
  move them. A test that needs tiles the snapshot does not have records them with
  `RECORD_OG_TILES=1` — commit what that writes. `embed-worker-live-tiles` is what still renders
  against openfreemap, and it takes no screenshot.

See [`../cf-og-worker/README.md`](../cf-og-worker/README.md).

## Ports

Tests target `http://localhost:$PORT`, defaulting to 8000. A checkout that runs
alongside another one sets `PORT` and `TESTCAFE_PORT` in `.envrc`, and `direnv`
only applies those to interactive shells — so a non-interactive shell will silently
test against the wrong site (or fail to connect) unless you go through
`direnv exec .`. `URBANSTATS_TEST_TARGET` overrides the URL entirely.

## Other flags

`--live` watches the test file and re-runs it, `--compare=true` runs the screenshot
comparison, and `--docker` runs in a CI-equivalent container. On a Mac, `--docker=host-arch`
builds that container for the host's architecture, which is the only way to run tests
without a browser window taking over the screen — but it renders a few pixels differently
from the references, so anything screenshot-related has to use `--docker` (`ci`) instead.
That includes regenerating the references locally, which `ci` mode can do. Either Docker
mode needs `--browser=chromium`. See [README.md](README.md) for worked examples and the
full set of caveats.
