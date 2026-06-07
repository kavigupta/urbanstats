# Example Commands

- Run tests with local Chrome. This command watches test files and re-runs the test. `--test` may be a glob value of test files. Use `test.only` within the tests to run only selected tests. On Linux, pass `--headless=false` to see the browser window.

  `npm run test:e2e -- '--test=test/mapper-edit-text-boxes-desktop.test.ts' --live`

- Run tests in a CI-equivalent Docker container, and debug the resulting page:

  `npm run test:e2e -- '--test=test/mapper-edit-text-boxes-desktop.test.ts' --live --docker --browser=chromium --remote-debugging-port=9222`

  Visit `chrome://inspect` in your local browser, and click "Inspect" to connect and interact.
