# Utilities

Check here before writing a new hook or helper. Each line says when to reach for the file. When you add a file to this directory, add a line here. Backticks in a line are for what that line's files export; `unit/utils-index.test.ts` checks the files and exports named here still exist.

## React hooks and state

- `useDebouncedResolve.ts`: rerun an async computation as its inputs change, no more often than an interval, and render with a loading flag.
- `useOrderedResolve.ts`: resolve a promise into state, ignoring results from promises that have since been replaced, and report loading to e2e tests.
- `Property.ts`: a mutable value outside React that components subscribe to with `.use()`.
- `useObserverSets.ts`: rerender when any callback in some observer sets fires (what `Property.use` is built on).
- `promiseStream.ts`: turn an array of promises into a Property of their results in order, with `waiting` for ones not yet done.
- `useUndoRedo.tsx`: undo/redo history with keyboard shortcuts and mobile buttons, for an editor's state and selection.
- `text-area-size-sync.tsx`: keep the heights of several textareas with the same identifier in sync.
- `responsive.ts`: whether the layout is mobile, the window width, and header classes and styles that depend on them.
- `transpose.ts`: whether the surrounding table is transposed.

## Data structures and types

- `DefaultMap.ts`: a Map that creates missing values on get.
- `types.ts`: `NormalizeProto` (strip protobuf's optionals and nulls), `RemoveOptionals`, `SwapKeysValues`.
- `array-edits.ts`: immutable swap, replace and edit-at-index on arrays.
- `typed-array-concat.ts`: concatenate typed arrays.
- `partition.ts`: search for the best partition of indices into groups under a scoring function, with a time limit.
- `defensive.ts`: `assert` that narrows types and works in the browser.

## Text and numbers

- `text.ts`: pluralize and localize type names, format numbers (separators, sig figs, k/m/B abbreviations, trailing zeros), hours and minutes, `camelToHuman`.
- `math.ts`: first non-NaN number of an array.
- `regression.ts`: weighted least-squares regression with NaN rows dropped, and R².
- `normalize-string.ts`: normalize a string for search (case, accents, punctuation).
- `isAMatch.ts`: score whether one string is a non-contiguous subsequence of another.
- `bitap.ts`, `bitap-selector.ts`: fuzzy string matching with an error budget, for search and for selectors.
- `random.ts`: random IDs.

## Units and human-readable names

- `unit.ts`: stored units of statistics, and temperature and precipitation conversion.
- `quantity.ts`: dimensioned quantities, unit arithmetic, and writing a quantity with its unit.
- `unit-search.ts`: choose the cheapest units to write a value of some dimensions in.
- `human-readable-element.ts`, `human-readable-template.ts`, `human-readable-name.tsx`: structured names (with code, superscripts, parentheses) built with the `hre` template tag and rendered as React or strings.

## Color and style

- `color.ts`: interpolate along a color ramp, mix with a background, pick a stable color for a name, pick the color furthest from others.
- `zIndex.ts`: every z-index layer on the site, in order. Add a layer here rather than writing a number.
- `code-style.ts`: the style for inline code, usable in Node unit tests.
- `a11y.ts`: props that make a non-button element act as a button for keyboard and screen readers.
- `layout.ts`: an element's offset from the page.
- `IFrameInput.tsx`: an input whose selection survives focus moving elsewhere in the page.

## Geography and maps

- `geometry.ts`: convert a protobuf Feature to GeoJSON.
- `coordinates.ts`: Web Mercator projection, and the aspect ratio of a map with insets.
- `partition-boxes.ts`: bounding box math, and splitting boxes into separate maps when they're too far apart.
- `restricted-types.ts`: whether a geography type (historical districts, population circles) is hidden by the user's settings.

## Data loading and files

- `symlinks.ts`: load an article or feature by longname, following symlinks.
- `paths.ts`: sanitize a longname for use in a path.
- `shardHash.ts`: which shard a longname is in.
- `gzip.ts`: gzip and gunzip streams, with a polyfill.
- `urlParamShort.ts`: gzip and base64 a string for a URL parameter.
- `Image.ts`: load an image as a promise.
- `saveAsFile.ts`: download a string or blob as a file.
- `upload.ts`: open a file picker and get the file, or `cancelled`.
- `page-conversion.ts`: convert a mapper page's USS to a table page's and back.

## External services

- `urbanstats-persistent-client.ts`: typed client for the persistent data backend.
- `google-drive-client.ts`: typed Google Drive client.

## Platform and debugging

- `platform.ts`: whether the user is on a Mac (for Cmd vs Ctrl).
- `segmenter.ts`: polyfill `Intl.Segmenter`.
- `TestUtils.ts`: whether we're in an e2e test, and loading hooks that tests wait on.
- `debug-logging.ts`: loggers by category, switched on in the file.
- `traced.ts`: log when an async step starts and ends, to find what hung in CI.
- `bad-keys.tsx`: elements with bad React keys, for testing key warnings.
