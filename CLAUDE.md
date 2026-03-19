# Urban Stats — Claude Code Review Guide

Urban Stats (urbanstats.org) is a website for viewing statistics of geographic areas in the US.

- **`urbanstats/`** — Python data processing pipeline that generates the website's static data
- **`react/`** — TypeScript/React frontend
- **`urbanstats-persistent-data/`** — FastAPI backend for persistent user data (quizzes, etc.)

## Key Architecture Notes

- **Statistics** are defined by subclassing `StatisticCollection` in `urbanstats/statistics/`
- **Protobuf** is used for data serialization between Python and the frontend — changes to `.proto` files require running `bash scripts/build-protos.sh`
- **`permacache`** caches Python function results to disk; changing a cached function's signature, module path, or the arguments it's called with can silently break or invalidate the cache
- `src/data/` in the frontend contains generated files — do not edit manually

## What to Flag in Code Reviews

These are things automated checks (linters, type checkers, tests) won't catch:

- **Cache key stability**: renaming, moving, or changing the signature of `permacache`-decorated functions can silently invalidate cached results or cause stale data to be served
- **Protobuf sync**: changes to `.proto` files without regenerating bindings, or frontend/backend changes that assume a protobuf schema change without updating both sides
- **Geospatial performance**: this pipeline processes the entire US — watch for operations that are O(n^2) or load entire datasets into memory unnecessarily
- **New dependencies**: added without clear justification, especially large or unmaintained packages
- **Mutations of shared state** in React components — prefer immutable update patterns
- **Correctness of statistical logic**: the site presents data publicly, so errors in computation or aggregation are high-impact
- **Logic errors**: off-by-one mistakes, wrong comparison operators, inverted conditions, missing edge cases (empty arrays, null/undefined, division by zero)
- **Typos in user-facing strings**: misspellings in UI text, labels, error messages, and tooltip content — these are not caught by linters
- **Copy-paste errors**: duplicated code where one copy wasn't updated (e.g., wrong variable name, leftover hardcoded value from the original)
- **Misleading names**: variables, functions, or parameters whose names don't match what they actually do, especially after refactoring
- **Race conditions in async code**: React useEffect cleanup missing, unhandled promise rejections, or state updates after unmount
- **Broken error handling**: catch blocks that swallow errors silently, or error paths that leave the app in an inconsistent state
- **Data loss risks**: operations that overwrite or delete data without confirmation, backup, or undo path
- **Inconsistent units or coordinate systems**: mixing degrees/radians, lat/lng vs lng/lat ordering, metric/imperial — easy to get wrong in geospatial code
- **API contract changes**: modifications to the FastAPI endpoints in `urbanstats-persistent-data/` that break existing frontend callers without updating both sides
- **Accessibility regressions**: missing alt text on images, non-interactive elements given click handlers without keyboard support, broken tab order
- **Hardcoded values that should be constants or config**: magic numbers, URLs, or thresholds buried in logic that will be hard to find and update later
- **Incomplete migrations**: adding a new statistic type or region category in Python without updating all the places that enumerate or switch over those types (frontend display, protobuf schema, tests)
- **Stale comments**: comments that describe behavior the code no longer has, or TODO comments referencing completed work
- **Security in the persistent-data API**: SQL injection via raw queries, missing auth checks on endpoints, user input passed unsanitized to file paths or shell commands
- **Browser compatibility**: use of newer JS/CSS APIs (e.g., `structuredClone`, `container queries`, `:has()`) without checking if they're supported by the target browsers
- **Memory leaks in React**: event listeners or subscriptions added without cleanup, growing arrays stored in refs across re-renders, closures capturing stale large objects
- **Numerical precision**: floating-point comparisons with `==`, aggregating large sums without compensation (Kahan summation), percentages that don't sum to 100 due to rounding
- **Unnecessary re-renders**: React components that receive new object/array references on every render as props, missing `useMemo`/`useCallback` for expensive computations passed to child components
- **Dead code paths**: conditions that can never be true, unreachable branches after early returns, or feature-flagged code where the flag is permanently on/off
- **Pandas/numpy pitfalls**: chained indexing that triggers SettingWithCopyWarning, using `.apply()` where vectorized operations exist, implicit dtype coercion losing precision (e.g., int64 → float64 on NaN insertion)
- **URL and routing breakage**: changes to URL structure or query parameters that would break existing bookmarks, shared links, or SEO — the site has publicly indexed pages
- **Sorting stability and locale issues**: sorting strings that include place names with accents, hyphens, or numbers — default sort may produce unexpected orderings
- **Missing loading/error states in UI**: new data fetches without corresponding loading spinners, skeleton screens, or error fallbacks — leaves users staring at blank content
- **Incorrect array/dict mutation in Python**: modifying a default mutable argument (`def f(x=[])`), mutating a list while iterating over it, or aliasing a list/dict when a copy was intended
- **Test coverage gaps**: new code paths or branches that aren't exercised by any existing test, especially edge cases in statistical computations
- **Inconsistent formatting of displayed numbers**: mixing different decimal places, missing thousands separators, or inconsistent handling of negative values/percentages across the UI
- **Schema drift in SQLite**: changes to the persistent-data database schema without a migration path for existing production data
- **Map rendering issues**: changes to GeoJSON handling, layer ordering, or zoom-level thresholds that could cause visual glitches, missing regions, or overlapping labels on the map
