# Urban Stats

Urban Stats (urbanstats.org) is a website for viewing statistics of geographic areas in the US.

- **`urbanstats/`** — Python data processing pipeline that generates the website's static data
- **`react/`** — TypeScript/React frontend
- **`urbanstats-persistent-data/`** — FastAPI backend for persistent user data (quizzes, etc.)

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
| [`scripts/AGENTS.md`](scripts/AGENTS.md) | moving commits between a stacked chain of PR branches (`01-*`, `02-*`, ...) |
| [`.github/code-review-guidelines.md`](.github/code-review-guidelines.md) | reviewing a change |

DO NOT run tests as part of a code review.
