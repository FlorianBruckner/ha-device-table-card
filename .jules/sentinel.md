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

## 2026-07-08 - [Harden Color CSS Sanitization for Resource-Loading Functions]
**Vulnerability:** While `url()` and `expression()` were blocked, modern CSS functions and legacy vendor prefixes (e.g., `image()`, `image-set()`, `-webkit-image-set()`, `element()`, `paint()`, `cross-fade()`) can also fetch external resources or execute custom rendering. Since these functions bypass simple `url` checks, they could be leveraged to exfiltrate client-side data or bypass CSP.
**Learning:** Expanding the blocklist using word boundaries (`\b`) matches both standard and prefixed versions (e.g., matching `-webkit-image-set` via `\bimage-set`) without needing complex lookarounds.
**Prevention:** Always sanitize style attributes by blocking all resource-loading, paint, and scriptable CSS functions in addition to `url`.

## 2026-07-09 - [Card Configuration Sandbox & Sanitization]
**Vulnerability:** Malicious card configurations containing prototype pollution payloads (`__proto__`, `constructor`, `prototype`) could be loaded via dashboard YAML, potentially polluting the global prototype chain or leading to UI-based Denial of Service and logic bypass. Additionally, non-string properties and malformed array structures in `highlight` configs could trigger unhandled exceptions in the renderer loop.
**Learning:** Deeply sanitizing configuration objects recursively inside `setConfig` strips dangerous properties at the boundaries before the configuration is stored. Hardening downstream functions with strict type guards and resilient array/object handling ensures robust rendering.
**Prevention:** Never trust structural patterns or types in parsed YAML configurations. Sanitize properties recursively and use explicit array/null-object guards during rendering and property access.
