## 2026-07-05 - [Optimize O(N*M) lookups in data processing]
**Learning:** In loops where multiple entity attributes are checked against multiple column configurations, pre-indexing the entities into a Map/Record by the lookup key (e.g., `device_class`) significantly reduces overhead compared to repeated `.find()` calls. Also, using standard `for` loops and `for...in` instead of `.forEach()` and `.keys()` can provide measurable wins in hot paths.
**Action:** Always check for nested searches in loops and replace with $O(1)$ lookups where possible.

## 2026-07-06 - [Lexicographical string comparison for ISO timestamps]
**Learning:** Comparing ISO 8601 strings lexicographically (`iso1 > iso2`) is significantly faster (up to 100x) than parsing each into a `Date` object and comparing numeric values. This is especially effective in hot loops where you only need to find the "latest" or "earliest" entry. Parsing should be deferred until after the loop.
**Action:** Use string comparison for finding min/max ISO timestamps in high-frequency data processing loops.

## 2026-07-07 - [Shift O(N) grouping costs to low-frequency paths]
**Learning:** In applications that process large registries (e.g., Home Assistant entities), iterating over the entire list to group by a key (like `device_id`) in a high-frequency update path (like state changes) is a major bottleneck. Pre-grouping the data into a `Map` during the low-frequency registry fetch/update path allows the high-frequency path to perform O(1) lookups, resulting in significant (10x+) speedups.
**Action:** Identify expensive grouping or transformation logic in frequent update paths and move them to the data-fetching or registry-update layer using pre-indexed Maps.
