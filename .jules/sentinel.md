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

## 2026-07-10 - [Null-Prototype Object Lookup Hardening]
**Vulnerability:** Using plain objects (`{}`) as key-value dictionaries for entities, areas, or metadata from external data sources allows property lookup clashes. If an external key matches inherited prototype properties (like `toString` or `hasOwnProperty`), the lookup resolves to a function, potentially leading to errors, crashes, or logical bypasses.
**Learning:** Creating dictionaries in low-frequency/registry-fetch paths using `Object.create(null)` removes any prototype inheritance, making the lookup completely immune to prototype property clashes.
**Prevention:** For dictionary lookups mapping dynamic external IDs, prioritize `Object.create(null)` to ensure safe, property-collision-free lookups.

## 2026-07-11 - [Harden Configuration Sanitization & Color Sanitization Length]
**Vulnerability:** Configuration structures loaded from user YAML parsed without tracking cyclic links could result in infinite recursive calls within `_sanitizeConfig`, causing browser crashes/DoS. Concurrently, unconstrained color string values validated via complex inline regex patterns presented ReDoS risks.
**Learning:** Incorporating a `WeakSet` to track visited nodes during configuration sanitization prevents recursive stack exhaustion completely. Limiting the color validation scope to strings strictly under 100 characters mitigates ReDoS potential on complex color rules.
**Prevention:** Always safeguard deep structural traversals against cycles and bound maximum input length limits on user input evaluated by regex checks.

## 2026-07-12 - [Strict Array Index Boundary Validation in Editor]
**Vulnerability:** Array manipulation functions in the configuration editor (`_deleteColumn`, `_moveColumn`, `_updateColumnProperty`, `_addHighlightRule`, `_deleteHighlightRule`, `_updateHighlightRule`) lacked safety checks for user-controlled index parameters. An invalid, negative, or out-of-bounds index could lead to unhandled runtime errors, UI crashes, or corrupt array states.
**Learning:** Checking parameter bounds explicitly (`index < 0 || index >= array.length`) is critical when working with index-based array operations triggered by user actions, preventing runtime panics and sparse array insertions.
**Prevention:** Always validate element indices against array boundaries before performing read, write, swap, or delete operations.

## 2026-07-13 - [DoS Prevention & Config Type Safety Guarding]
**Vulnerability:** Malformed WebSocket API responses or non-array values for card `columns` or registries would cause unhandled client-side TypeError runtime crashes, resulting in a localized Denial of Service (DoS) of the Home Assistant dashboard. Additionally, extremely large configuration parameters could trigger potential browser memory exhaustion.
**Learning:** Adding robust `Array.isArray` guards on user inputs, registry lists, and configuration arrays, combined with a 1000-character ceiling on config string elements, guarantees high resilience against malformed data types and bounds exhaustion.
**Prevention:** Always validate all external inputs (such as WebSocket responses and user-controlled configuration objects) with rigorous runtime array and string type-guards before performing iterations or accessing array/string length methods.

## 2026-07-14 - [Config Nesting Depth and Cache Size Limits DoS Prevention]
**Vulnerability:** While circular reference tracking and string length ceilings were previously implemented, recursive sanitization `_sanitizeConfig` still posed a threat of call stack size exhaustion (Denial of Service) if user configurations contained extremely deeply nested objects (e.g., 1000 nested properties). Concurrently, the unconstrained Map-based `_colorCache` utilized in CSS sanitization posed a potential memory exhaustion DoS vulnerability if an attacker repeatedly fed in unique, high-frequency malicious color rules.
**Learning:** Recursively evaluating nested configuration objects must be bounded by a strict depth limit (e.g., 20 levels deep) to guarantee safety from browser stack overflow. Additionally, in-memory cache structures like `_colorCache` must be strictly bounded in size (e.g., max 500 entries) and cleared when exceeded to completely immunize the system from memory growth attacks.
**Prevention:** Always enforce strict recursion depth ceilings on nested object parsing and apply size limits on in-memory dictionary caches.

## 2026-07-15 - [States Registry Prototype and Type Safety]
**Vulnerability:** Dynamic lookup of entity states from the Home Assistant global `hass.states` registry by config-driven or registry-driven `entity_id` values could result in prototype lookup clashes (e.g., if an entity ID is `toString` or `__proto__`) or runtime TypeErrors if state payloads are malformed or non-objects.
**Learning:** Checking property ownership on the global `hass.states` object using `Object.prototype.hasOwnProperty.call(states, entity_id)` guarantees that built-in prototype methods/properties cannot be misidentified as valid state records. Additionally, explicit `typeof stateObj === 'object'` type checks prevent downstream client-side crashes when accessing nested properties (like `attributes`) of malformed state records.
**Prevention:** Always use `Object.prototype.hasOwnProperty.call` to retrieve dynamic entries from global registry objects by external keys and validate that returned states are objects before accessing their sub-properties.

## 2026-07-16 - [State Attributes Safety & DoS Prevention]
**Vulnerability:** Potential client-side unhandled TypeErrors and card UI Denial of Service (DoS) could occur if entity state objects in `hass.states` returned by Home Assistant were missing `attributes` or had them set to null, causing attempts to access nested properties like `friendly_name` or `unit_of_measurement` to crash the card render cycle.
**Learning:** Utilizing optional chaining (`attributes?.friendly_name`, `attributes?.unit_of_measurement`) guarantees that nested attribute properties are safely resolved, completely immunizing the UI against crashes caused by custom integrations or malformed/incomplete state objects.
**Prevention:** Always employ optional chaining or explicit property existence checks before navigating nested properties of objects received from external dynamic registries.

## 2026-07-17 - [Harden State Attributes Lookup & Type Validation]
**Vulnerability:** Prototype pollution on properties like `friendly_name`, `unit_of_measurement`, and `device_class` nested inside `stateObj.attributes` could pollute lookup calculations or rendering, leading to client-side data leaks or logic bypasses.
**Learning:** Direct property checks using secure `hasOwnProperty` pattern combined with strict string type-guards (`typeof val === 'string'`) ensures that only explicit, valid string values declared on the attributes object are resolved.
**Prevention:** Always guard custom nested property resolutions on API payload and Home Assistant objects using safe `hasOwnProperty` calls and strict string type-guard checks.
