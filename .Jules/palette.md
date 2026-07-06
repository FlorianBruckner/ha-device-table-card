## 2025-05-15 - [Initial UX Review]
**Learning:** Micro-interactions like tooltips on relative timestamps and hover titles on clickable cells significantly improve the discoverability and accessibility of information in a data-heavy table.
**Action:** Always provide full context (like absolute timestamps) when displaying relative times, and use descriptive titles for interactive elements that don't have explicit labels.

## 2025-05-15 - [Keyboard Accessibility in Custom Cards]
**Learning:** For custom Home Assistant cards using third-party DOM-manipulating libraries like DataTables, manual injection of `tabindex`, `role="button"`, and keyboard event listeners is necessary to ensure interactive cells remain accessible within the Shadow DOM.
**Action:** Always verify that elements with click handlers are reachable via keyboard and have appropriate ARIA roles, especially when using libraries that bypass standard Lit/React event binding.
