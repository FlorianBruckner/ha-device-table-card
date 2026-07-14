## 2025-05-15 - [Descriptive Context in Tooltips]
**Learning:** Generic tooltips like "View entity details" are less helpful than specific ones like "View [Entity Name] details". Providing the specific name in the tooltip improves accessibility for screen reader users and discoverability for mouse users.
**Action:** When creating interactive elements for specific data objects, always include the object's name or a unique identifier in the `title` or `aria-label`.

## 2025-05-15 - [Domain-Specific Language in Third-Party Components]
**Learning:** Default terms in libraries (like "entries" in DataTables) can feel out of place in a specialized application like Home Assistant. Customizing these strings to use domain terms ("devices") makes the UI feel more integrated and professional.
**Action:** Always review and customize the language/localization settings of third-party UI components to match the application's vocabulary.

## 2025-05-16 - [Collapsible Accordion Form Layouts for Dashboard Card Editors]
**Learning:** Dashboard card editors in Home Assistant can grow incredibly long and confusing when multiple complex nested objects (like columns and threshold highlights) are added. Employing a collapsible accordion layout with single-item expansion state tracking simplifies visual noise and dramatically improves the user experience.
**Action:** When designing complex custom card config editors, group inputs into logical collapsible sections, and track a single active expanded item to keep the editor clean and focus-driven.

## 2025-05-18 - [Fixing Cursor Jumps and Input Loss in Custom Lit Editors]
**Learning:** For high-frequency state updates in Lit-based text editors (like Home Assistant card editors), immediately converting inputs to numbers on keypress causes the value to reset on re-render. This deletes intermediate characters like decimal points (`.`) and minus signs (`-`), preventing users from typing valid decimal or negative numbers.
**Action:** Always allow inputs in custom textfields to be handled and stored as strings in configuration state, and only parse them to float or integer during rendering or evaluation stages.

## 2025-05-20 - [Safe Keyboard Event Handlers for Nested Interactivity]
**Learning:** Adding a `keydown` handler to a parent container (like an accordion header) that also contains native buttons can cause "double-triggering". If a user focuses a child button and presses Enter, the button clicks, the event bubbles to the parent, and the parent's handler may programmatically click the button again.
**Action:** In keyboard handlers for composite components, always verify `ev.target === ev.currentTarget` before programmatically triggering a click, or use `ev.stopPropagation()` on child elements.

## 2025-05-20 - [Communicating State with aria-expanded]
**Learning:** Marking an element with `role="button"` is not enough for toggleable UI sections. Screen reader users need to know if the section is currently open or closed to navigate effectively.
**Action:** Always pair `role="button"` with `aria-expanded` (set to "true" or "false") for elements that control the visibility of other content.

## 2025-05-22 - [Contextual Explanations for Visual Highlights]
**Learning:** Visual highlights (like color changes or bold text) draw attention but don't always explain *why* something is highlighted. Providing a descriptive tooltip (via `title` attribute) explaining the triggered threshold rule (e.g., "Value is below threshold: 15") provides essential context for all users and improves accessibility for screen readers.
**Action:** Whenever a visual style is applied based on a conditional rule or threshold, always include a descriptive text explanation as a tooltip or ARIA description.

## 2025-05-22 - [Improving Header Affordance and Feedback]
**Learning:** In data-dense tables, the fact that headers are interactive (sortable) can be easily missed if they look static. Adding clear hover states (`background-color`), transitions, and high-contrast color indicators for active sorted states significantly improves the discoverability of sorting features.
**Action:** Ensure all interactive table headers have distinct hover styles, focus-visible indicators, and clear visual feedback for their active state (e.g., sorted ascending/descending).
