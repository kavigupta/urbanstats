# Running the unit tests

Run from `react/`:

```
direnv exec . npm run test:unit -- '--test=unit/load_json.test.ts'
```

- `--test` is required. It may be a glob (`'unit/urban-stats-script-*.test.ts'`); quote
  it so the shell doesn't expand it first. Running the whole suite with
  `'unit/*.test.ts'` is fine — unlike the e2e tests, these are quick.
- `test.only` is ignored unless you also pass `--only=true`.
- `--parallel=N` sets how many files run at once; it defaults to the CPU count.

## These tests need the dev server too

Not obvious from the name: [util/fetch.ts](util/fetch.ts) points `global.fetch` at
`http://localhost:$PORT`, so every test that loads site data (`load_json`, `search`,
`random`, `relationship`, `map-partition`, ...) needs a dev server running, exactly like
the e2e tests. Assume one is already running rather than starting one, and see
[../test/AGENTS.md](../test/AGENTS.md) for why the command above goes through
`direnv exec .` — `PORT` comes from `.envrc`, which doesn't reach a non-interactive
shell. Getting this wrong points the tests at the wrong site, or at nothing.

`fetch failed` / `ECONNRESET` from one of those tests means the dev server didn't
serve the file, not that your change broke something.

## Coverage

`npm run test:unit:coverage` takes the same arguments. [README.md](README.md) covers
viewing the results in VSCode.
