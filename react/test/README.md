# Example Commands

- Run tests with local Chrome. This command watches test files and re-runs the test. `--test` may be a glob value of test files. Use `test.only` within the tests to run only selected tests. On Linux, pass `--headless=false` to see the browser window.

  `npm run test:e2e -- '--test=test/mapper-edit-text-boxes-desktop.test.ts' --live`

- Run tests in a CI-equivalent Docker container, and debug the resulting page:

  `npm run test:e2e -- '--test=test/mapper-edit-text-boxes-desktop.test.ts' --live --docker --browser=chromium --remote-debugging-port=9222`

  Visit `chrome://inspect` in your local browser, and click "Inspect" to connect and interact.

- Regenerate the reference screenshots, instead of commenting `!updateScreenshots` on a PR:

  ```
  npm run test:e2e -- '--test=test/mapper-edit-text-boxes-desktop.test.ts' --docker --browser=chromium --compare=true
  rsync -a --exclude='*.error.png' \
    changed_screenshots/mapper-edit-text-boxes-desktop/ \
    ../reference_test_screenshots/mapper-edit-text-boxes-desktop/
  ```

  Name the tests you just ran, rather than syncing `changed_screenshots/` whole. A run
  only clears that directory for its own test, so it accumulates output from every
  earlier run — and those stale images would overwrite references the run never looked at.

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
`check_images.py`'s near-exact threshold. Use `ci` for `--compare` and for regenerating references.

TestCafe ships no `arm64` build of the helper binaries behind `t.resizeWindow` and friends, so those
run as `i386` binaries under emulation. Chromium and Node, where the time goes, run natively.

`--docker-options` passes whitespace-separated options through to `docker run`. GitHub's runners have
four cores, so capping the container's is a way to tell whether a failure is timing-dependent:

`npm run test:e2e -- '--test=test/mapper-ux_x1.test.ts' --docker=host-arch --browser=chromium --docker-options='--cpus 2'`

Write each option in its `--flag value` form. `zodcli` drops everything after a second `=`, so
`--docker-options=--cpus=2` silently arrives as `--cpus` alone.

`--docker-option` passes an option through to `docker run`, and may be repeated. GitHub's runners
have four cores, so `--docker-option=--cpus=2` is a way to see whether a failure is timing-dependent:

`npm run test:e2e -- '--test=test/mapper-ux_x1.test.ts' --docker=host-arch --browser=chromium --docker-option=--cpus=2`
