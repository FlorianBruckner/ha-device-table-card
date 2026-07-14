## 2026-07-06 - [Enhanced XSS Protection with html-escaper]
**Vulnerability:** Manual HTML escaping was used in DataTables rendering, which is error-prone and can lead to XSS if edge cases are missed.
**Learning:** Replaced manual regex-based escaping with the robust `html-escaper` library as recommended by architectural guidelines.
**Prevention:** Always use established security libraries for data sanitization instead of custom implementations.

## 2025-05-22 - [Search Index Integrity in DataTables]
**Vulnerability:** HTML markup used for visual highlighting was being indexed by DataTables, allowing users to find rows by searching for internal tag names (e.g., "span").
**Learning:** DataTables `render` function is called for different purposes (`display`, `filter`, `sort`). Returning HTML for all types pollutes the search and sort index and can expose internal structure.
**Prevention:** Always check the `type` parameter in DataTables `render` functions and only return HTML markup when `type === 'display'`. For other types, return raw text.

## 2026-07-07 - [Strict Allowlist for Device Property Access]
**Vulnerability:** The data processor used dynamic property access `(d as any)[prop]` for device columns, which could be exploited to access sensitive internal properties like `__proto__` or `constructor` via malicious dashboard configurations.
**Learning:** Even when most properties are whitelisted, an `else` block that falls back to dynamic access creates a security gap. Transitioning from a "blocklist" of forbidden properties to a strict "allowlist" for custom properties provides defense-in-depth.
**Prevention:** Avoid dynamic property access on objects from external/user-controlled strings. Use strict allowlists for any properties not handled by explicit logic.
