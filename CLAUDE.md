# Urban Stats

Urban Stats (urbanstats.org) is a website for viewing statistics of geographic areas in the US.

- **`urbanstats/`** — Python data processing pipeline that generates the website's static data
- **`react/`** — TypeScript/React frontend
- **`urbanstats-persistent-data/`** — FastAPI backend for persistent user data (quizzes, etc.)
- **`react/cf-og-worker/`** — Cloudflare Worker that gives pages per-URL link embeds, bundling frontend code

## Key Architecture Notes

- **Statistics** are defined by subclassing `StatisticCollection` in `urbanstats/statistics/`
- **Protobuf** is used for data serialization between Python and the frontend — changes to `.proto` files require running `bash scripts/build-protos.sh`
- **`permacache`** caches Python function results to disk; changing a cached function's signature, module path, or the arguments it's called with can silently break or invalidate the cache
- `src/data/` in the frontend contains generated files — do not edit manually

## Further Reading

Read these when the task calls for them, rather than up front:

| Doc | Read it when |
| --- | --- |
| [`react/test/AGENTS.md`](react/test/AGENTS.md) | running or writing e2e tests |
| [`react/unit/AGENTS.md`](react/unit/AGENTS.md) | running or writing unit tests |
| [`react/cf-og-worker/README.md`](react/cf-og-worker/README.md) | working on link embeds or the preview card |
| [`scripts/AGENTS.md`](scripts/AGENTS.md) | moving commits between a stacked chain of PR branches (`01-*`, `02-*`, ...) |
| [`.github/code-review-guidelines.md`](.github/code-review-guidelines.md) | reviewing a change |

DO NOT run tests as part of a code review.

## Some important locations

Most of the time, there is already a live website being served locally at `localhost:8000`. On machine `unimatrix` the website is loaded from `~/temp/site`, build into this directory. On machine `teroknor`, the website is loaded from `~/urbanstats-site-backup/densitydb.github.io/`. To build the website, run

```
python create_website.py --site-folder <location> --mode dev --target scripts
```

in bash or zsh.

The dev server (`npm run watch`, from `react/`) mirrors its output to
`react/dev-server.log`, trimmed to its last few thousand lines. Read that to see
whether a rebuild succeeded. Its incremental builds sometimes get stuck in a bad
state; `killall rspack-node` fixes that, and the watcher restarts itself.