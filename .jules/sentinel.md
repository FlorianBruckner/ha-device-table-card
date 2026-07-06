## 2026-07-06 - [Enhanced XSS Protection with html-escaper]
**Vulnerability:** Manual HTML escaping was used in DataTables rendering, which is error-prone and can lead to XSS if edge cases are missed.
**Learning:** Replaced manual regex-based escaping with the robust `html-escaper` library as recommended by architectural guidelines.
**Prevention:** Always use established security libraries for data sanitization instead of custom implementations.
