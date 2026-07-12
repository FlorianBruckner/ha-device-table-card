## 2026-07-06 - [Enhanced XSS Protection with html-escaper]
**Vulnerability:** Manual HTML escaping was used in DataTables rendering, which is error-prone and can lead to XSS if edge cases are missed.
**Learning:** Replaced manual regex-based escaping with the robust `html-escaper` library as recommended by architectural guidelines.
**Prevention:** Always use established security libraries for data sanitization instead of custom implementations.

## 2025-05-22 - [Search Index Integrity in DataTables]
**Vulnerability:** HTML markup used for visual highlighting was being indexed by DataTables, allowing users to find rows by searching for internal tag names (e.g., "span").
**Learning:** DataTables `render` function is called for different purposes (`display`, `filter`, `sort`). Returning HTML for all types pollutes the search and sort index and can expose internal structure.
**Prevention:** Always check the `type` parameter in DataTables `render` functions and only return HTML markup when `type === 'display'`. For other types, return raw text.
