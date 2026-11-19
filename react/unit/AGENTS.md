# Running the unit tests

Run from `react/`:

```
direnv exec . npm run test:unit -- '--test=unit/load_json.test.ts' --reporter=dot
```

- `--test` is required. It may be a glob (`'unit/urban-stats-script-*.test.ts'`); quote
  it so the shell doesn't expand it first. Running the whole suite with
  `'unit/*.test.ts'` is fine — unlike the e2e tests, these are quick.
- **Pass `--reporter=dot`, and don't pipe the output through `head`, `tail`, or
  `grep`.** The default `spec` reporter prints a line per test, which buries the
  result; `dot` prints one character per test and still ends with the full failure
  detail, so a whole-suite run is short enough to read.
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

## Coverage

`npm run test:unit:coverage` takes the same arguments. [README.md](README.md) covers
viewing the results in VSCode.

## Benchmarking search

`npm run bench:search` times `search` against the real index and prints ms/query. It takes
about 20 seconds and needs a dev server, like the tests. Run it on both sides of a change and
compare; the absolute number is meaningless across machines, and rounds within a run land
inside about 1%.

Its 85 queries are every ninth query of a longer set built by typing 40 real longnames one
character at a time, which is what makes it representative: cost peaks sharply between 4 and 10
characters, and a set that samples lengths evenly rather than the way typing does reads about
25% cheap. The subsample is within 1% of the full set it came from. It also builds the index
with `statsUniverse: 'allUniverses'`, since that is what the site does whenever the search box
links statistics, and omitting it understates cost by about 11%.
