## 2025-05-15 - [Descriptive Context in Tooltips]
**Learning:** Generic tooltips like "View entity details" are less helpful than specific ones like "View [Entity Name] details". Providing the specific name in the tooltip improves accessibility for screen reader users and discoverability for mouse users.
**Action:** When creating interactive elements for specific data objects, always include the object's name or a unique identifier in the `title` or `aria-label`.

## 2025-05-15 - [Domain-Specific Language in Third-Party Components]
**Learning:** Default terms in libraries (like "entries" in DataTables) can feel out of place in a specialized application like Home Assistant. Customizing these strings to use domain terms ("devices") makes the UI feel more integrated and professional.
**Action:** Always review and customize the language/localization settings of third-party UI components to match the application's vocabulary.

## 2026-07-09 - [Context-Aware Empty States and Keyboard Focus]
**Learning:** Default library messages (like "No data available in table") can be jarring in a specialized context like Home Assistant. Customizing these to use domain-specific terms ("devices") makes the UI feel more integrated. Additionally, using `:focus-visible` for pagination controls ensures accessibility for keyboard users without adding visual noise for mouse users.
**Action:** Always customize the localization/language configuration of third-party components to match the app's domain and ensure interactive controls have clear, non-intrusive focus indicators.
