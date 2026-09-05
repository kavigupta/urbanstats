# Example Commands

- Run tests with local Chrome. This command watches test files and re-runs the test. `--test` may be a glob value of test files. Use `test.only` within the tests to run only selected tests. On Linux, pass `--headless=false` to see the browser window.

  `npm run test:e2e -- '--test=test/mapper-edit-text-boxes-desktop.test.ts' --live`

- Run tests in a CI-equivalent Docker container, and debug the resulting page:

  `npm run test:e2e -- '--test=test/mapper-edit-text-boxes-desktop.test.ts' --live --docker --browser=chromium --remote-debugging-port=9222`

  Visit `chrome://inspect` in your local browser, and click "Inspect" to connect and interact.

- Regenerate the reference assets, instead of commenting `!updateAssets` on a PR:

  `npm run test:e2e -- '--test=test/mapper-edit-text-boxes-desktop.test.ts' --docker --browser=chromium --write=true`

  `--write` compares as `--compare` does and then overwrites the references that differ, for
  the tests that passed. A test that failed leaves its references alone, since it stopped
  before producing all of them.

  Reference strings — the CSV, XML and GeoJSON a test saves with `saveString` — live in the
  same tree and regenerate the same way. Nothing checks them without `--compare=true`.

- Pull what CI's run for the current branch produced, rather than rerunning the tests
  locally: `python -m scripts.grab_assets`. It updates the references in place and prints
  a `file://` link to the deltas.

- Run the tests off-screen on a Mac, in a container built for the host's architecture:

  `npm run test:e2e -- '--test=test/mapper-edit-text-boxes-desktop.test.ts' --docker=host-arch --browser=chromium`

# Docker modes

| Value | Meaning |
| --- | --- |
| `none` (default) | Run on the host, against a browser installed there. |
| `ci` (what a bare `--docker` means) | Run in a container built for `linux/amd64`, matching the CI. |
| `host-arch` | Run in the same container, built for the host's architecture instead. |

Either container needs `--browser=chromium`, since it has Chromium rather than Chrome.

`host-arch` avoids emulating `amd64`, but **can't do anything screenshot-related**: `arm64` Chromium
antialiases a handful of pixels differently, well below what anyone would notice but well above
`check_assets.py`'s near-exact threshold. Use `ci` for `--compare` and for regenerating references.

TestCafe ships no `arm64` build of the helper binaries behind `t.resizeWindow` and friends, so those
run as `i386` binaries under emulation. Chromium and Node, where the time goes, run natively.

`--docker-options` passes whitespace-separated options through to `docker run`. GitHub's runners have
four cores, so capping the container's is a way to tell whether a failure is timing-dependent:

`npm run test:e2e -- '--test=test/mapper-ux_x1.test.ts' --docker=host-arch --browser=chromium --docker-options='--cpus 2'`

Write each option in its `--flag value` form. `zodcli` drops everything after a second `=`, so
`--docker-options=--cpus=2` silently arrives as `--cpus` alone.
