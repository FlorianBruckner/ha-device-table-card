## 2026-07-05 - [Optimize O(N*M) lookups in data processing]
**Learning:** In loops where multiple entity attributes are checked against multiple column configurations, pre-indexing the entities into a Map/Record by the lookup key (e.g., `device_class`) significantly reduces overhead compared to repeated `.find()` calls. Also, using standard `for` loops and `for...in` instead of `.forEach()` and `.keys()` can provide measurable wins in hot paths.
**Action:** Always check for nested searches in loops and replace with $O(1)$ lookups where possible.

## 2026-07-06 - [Lexicographical string comparison for ISO timestamps]
**Learning:** Comparing ISO 8601 strings lexicographically (`iso1 > iso2`) is significantly faster (up to 100x) than parsing each into a `Date` object and comparing numeric values. This is especially effective in hot loops where you only need to find the "latest" or "earliest" entry. Parsing should be deferred until after the loop.
**Action:** Use string comparison for finding min/max ISO timestamps in high-frequency data processing loops.

## 2026-07-07 - [Shift entity grouping to low-frequency path]
**Learning:** In Home Assistant dashboard cards, registry entities are often processed for every device on every state update. Shifting the cost of grouping entities by `device_id` from the high-frequency state update path (`processDevices`) to the low-frequency registry fetch/update path (`_fetchRegistries`) yields significant performance gains.
**Action:** Use Map-based pre-grouping for registry data that doesn't change on every state update to avoid (E)$ scans in the render loop.

## 2026-07-08 - [Consolidated loops and conditional parsing]
**Learning:** Merging multiple loops over large datasets (e.g., 1000+ devices) into a single pass reduces iteration and allocation overhead. Furthermore, using conditional flags to skip expensive operations (like ISO 8601 parsing) when the resulting data isn't needed by any active column provides significant gains in high-frequency update paths.
**Action:** Consolidate data processing into single passes and implement feature-flagged logic to bypass unnecessary computations based on configuration.

## 2026-07-09 - [Consolidated Suffix Matching and Object Elimination]
**Learning:** Moving suffix-based entity matching into a primary entity iteration loop (pre-calculated via column indexing) eliminates the need for redundant $O(M \times N)$ scans. Furthermore, bypassing the creation of intermediate "wrapper" objects for every entity significantly reduces GC pressure and heap churn in environments with high entity counts.
**Action:** Use pre-calculated column requirement maps to resolve all entity types in a single pass, and work directly with raw data objects where possible.

## 2026-07-10 - [Hoisting resolution strategies and early-exit]
**Learning:** Pre-calculating resolution strategies (e.g., property access vs. fixed strings) during a configuration pre-pass avoids redundant branching and Set lookups in the main iteration loop. Additionally, tracking match counts for multi-entity lookups (like suffixes) enables early-exit, saving significant cycles in devices with many entities.
**Action:** Hoist resolution logic to the configuration pre-pass and implement match-count based early-exits for entity scanning loops.
