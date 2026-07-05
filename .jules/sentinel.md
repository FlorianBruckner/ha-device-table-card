## 2025-05-15 - [XSS via Configuration Properties]
**Vulnerability:** User-configurable properties rendered directly into HTML without robust escaping could allow for XSS attacks.
**Learning:** Manual HTML escaping implementations can be brittle or incomplete. It's better to use established libraries for this purpose.
**Prevention:** Use a robust HTML escaping library like `html-escaper` for all dynamic content rendered into the DOM.
