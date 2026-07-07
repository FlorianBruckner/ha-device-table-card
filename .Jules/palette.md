## 2025-05-15 - [Descriptive Context in Tooltips]
**Learning:** Generic tooltips like "View entity details" are less helpful than specific ones like "View [Entity Name] details". Providing the specific name in the tooltip improves accessibility for screen reader users and discoverability for mouse users.
**Action:** When creating interactive elements for specific data objects, always include the object's name or a unique identifier in the `title` or `aria-label`.

## 2025-05-15 - [Domain-Specific Language in Third-Party Components]
**Learning:** Default terms in libraries (like "entries" in DataTables) can feel out of place in a specialized application like Home Assistant. Customizing these strings to use domain terms ("devices") makes the UI feel more integrated and professional.
**Action:** Always review and customize the language/localization settings of third-party UI components to match the application's vocabulary.
