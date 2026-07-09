## 2026-07-06 - [Enhanced XSS Protection with html-escaper]
**Vulnerability:** Manual HTML escaping was used in DataTables rendering, which is error-prone and can lead to XSS if edge cases are missed.
**Learning:** Replaced manual regex-based escaping with the robust `html-escaper` library as recommended by architectural guidelines.
**Prevention:** Always use established security libraries for data sanitization instead of custom implementations.

## 2026-07-07 - [Defense in Depth: Sanitization and Prototype Pollution Protection]
**Vulnerability:** Potential for Prototype Pollution in the configuration editor and CSS Injection in threshold highlight colors.
**Learning:** Whitelist-based sanitization for CSS colors must be balanced with functionality; a too-restrictive regex (`/[^a-zA-Z0-9#]/g`) breaks CSS variables and functions. A broader whitelist (`/[^a-zA-Z0-9#\(\), \-\.\/]/g`) is safer for Home Assistant's themed environment while still blocking injection characters like `;` and `:`.
**Prevention:** Use specific blocklists for prototype pollution (`__proto__`, `constructor`, `prototype`) and carefully tuned whitelists for CSS properties to ensure security without breaking theming capabilities.
