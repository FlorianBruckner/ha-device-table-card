## 2026-07-06 - [Enhanced XSS Protection with html-escaper]
**Vulnerability:** Manual HTML escaping was used in DataTables rendering, which is error-prone and can lead to XSS if edge cases are missed.
**Learning:** Replaced manual regex-based escaping with the robust `html-escaper` library as recommended by architectural guidelines.
**Prevention:** Always use established security libraries for data sanitization instead of custom implementations.

## 2026-07-06 - [DataTables Search Integrity and Highlighting]
**Vulnerability:** DataTables search engine matched against internal HTML markup (e.g., `<span style="...">`) used for threshold highlighting, leading to "false positive" search results.
**Learning:** When using custom `render` functions in DataTables to inject HTML, the `type` parameter must be checked. If `type` is `filter` or `sort`, raw data should be returned instead of HTML-decorated strings.
**Prevention:** Always distinguish between `display`, `filter`, and `sort` types in DataTables renderers to ensure search and sort operations act on data, not markup.
