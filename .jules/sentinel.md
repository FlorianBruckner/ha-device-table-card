## 2025-05-15 - [CSS Injection via Configuration Properties]
**Vulnerability:** User-configurable properties rendered directly into HTML `style` attributes (like `color`) allowed for CSS injection. An attacker with access to the card configuration could inject arbitrary CSS (e.g., `red; display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; z-index: 9999;`) to overlay the entire UI.
**Learning:** HTML escaping alone is insufficient when data is placed inside a `style` attribute. Special characters like `;`, `{`, and `}` must be blocked or sanitized.
**Prevention:** Use a strict whitelist regex for CSS values (e.g., allowing only alphanumeric, `#`, `()`, `,`, `.`, `%`, and `var()`) and centralize HTML escaping to include the forward slash `/`.
