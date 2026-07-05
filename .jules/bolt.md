## 2025-05-15 - [Optimize O(N*M) lookups in data processing]
**Learning:** In loops where multiple entity attributes are checked against multiple column configurations, pre-indexing the entities into a Map/Record by the lookup key (e.g., `device_class`) significantly reduces overhead compared to repeated `.find()` calls. Also, using standard `for` loops and `for...in` instead of `.forEach()` and `.keys()` can provide measurable wins in hot paths.
**Action:** Always check for nested searches in loops and replace with $O(1)$ lookups where possible.
