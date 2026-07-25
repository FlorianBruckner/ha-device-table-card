## 2026-07-15 - [Static Filter Cache Bypassing]
**Learning:** Devices that are excluded from display by static configuration filters (such as `manufacturer`, `area`, or `integration`) do not need to track dynamic entity state updates. Marking these cached entries with an `isStaticFilter` flag and setting `entityStates` to `undefined` allows us to skip the high-frequency entity iteration loop during device processing and avoid redundant state-checking lookups on consecutive updates. This yields a ~1.87x speedup for cards with highly targeted static filters.
**Action:** Skip dynamic attribute or state tracking for elements that fail static pre-filtering steps to eliminate GC and iteration overhead.

## 2026-07-16 - [Dynamic Property Traversal Overhead]
**Learning:** Optimizing list equality checking (`_areDeviceDataListsEqual`) by pre-extracting keys once into arrays (`Object.keys` or `for...in` loop) can surprisingly be slower (up to 2x) than a simple direct `for...in` traversal on the objects. Modern JS engines heavily optimize hot `for...in` loops over similarly-shaped stable objects, making manual key-caching micro-optimizations a pessimization.
**Action:** Rely on standard direct `for...in` property loops for matching object state records instead of extracting keys to arrays.

## 2026-07-15 - [Fast-Path Identification in Shallow List Comparisons]
**Learning:** When performing element-by-element shallow equality checking on complex datasets (such as lists of custom objects representing devices), nested loops checking properties and sub-records are slow. Adding a fast-path unique identifier check (`da.id !== db.id`) as the very first operation inside the loop avoids costly property iterations when the list has changed order, items were added/deleted, or we are comparing different elements.
**Action:** When comparing lists of records, always short-circuit with a fast unique ID comparison check first.

## 2026-07-15 - [RegExp Cache for Repeated Text Processing]
**Learning:** Standard RegExp `replace` and matching patterns are expensive when executed repeatedly on every rendering cycle or for every cell. Using a simple, fast-lookup `Map` to cache the inputs and output of sanitization helpers (like `_sanitizeColor`) yields significant rendering speedups with almost zero memory overhead.
**Action:** Cache the results of regex-based validation/sanitization functions using a Map keyed by input strings.
