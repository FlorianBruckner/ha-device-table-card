## 2026-07-15 - [Fast-Path Identification in Shallow List Comparisons]
**Learning:** When performing element-by-element shallow equality checking on complex datasets (such as lists of custom objects representing devices), nested loops checking properties and sub-records are slow. Adding a fast-path unique identifier check (`da.id !== db.id`) as the very first operation inside the loop avoids costly property iterations when the list has changed order, items were added/deleted, or we are comparing different elements.
**Action:** When comparing lists of records, always short-circuit with a fast unique ID comparison check first.

## 2026-07-15 - [RegExp Cache for Repeated Text Processing]
**Learning:** Standard RegExp `replace` and matching patterns are expensive when executed repeatedly on every rendering cycle or for every cell. Using a simple, fast-lookup `Map` to cache the inputs and output of sanitization helpers (like `_sanitizeColor`) yields significant rendering speedups with almost zero memory overhead.
**Action:** Cache the results of regex-based validation/sanitization functions using a Map keyed by input strings.
