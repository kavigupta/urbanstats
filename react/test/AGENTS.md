# Running the e2e tests

Run from `react/`:

```
direnv exec . npm run test:e2e -- '--test=test/checkbox_bug.test.ts'
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
- **Don't pipe the output through `head`, `tail`, or `grep`.** A run you truncate is a
  run you have to do again, and these take minutes. The output is small enough to read
  in full; if you find it too noisy to work with, say so instead of filtering it.

## Ports

Tests target `http://localhost:$PORT`, defaulting to 8000. A checkout that runs
alongside another one sets `PORT` and `TESTCAFE_PORT` in `.envrc`, and `direnv`
only applies those to interactive shells — so a non-interactive shell will silently
test against the wrong site (or fail to connect) unless you go through
`direnv exec .`. `URBANSTATS_TEST_TARGET` overrides the URL entirely.

## Other flags

`--live` watches the test file and re-runs it, `--compare=true` runs the screenshot
comparison, and `--docker` runs in a CI-equivalent container. See [README.md](README.md)
for worked examples.
