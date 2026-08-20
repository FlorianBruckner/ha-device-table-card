## 2025-05-18 - Deterministic Form Input IDs in Shadow DOM Lit Components
**Learning:** Generating native `<input id="...">` using `Math.random()` inside Lit render methods breaks persistent `<label for="...">` and `aria-describedby` focus/screen-reader bindings on re-render.
**Action:** Pass explicit, deterministic field context/suffixes (e.g. `col-0-hl-0-below`) to `_renderInput` helpers so generated element IDs remain consistent across state updates.

## 2025-05-19 - Accessible ARIA Labels on Interactive DataTables Cells
**Learning:** DataTables cells configured as interactive targets (`role="button"`, `tabindex="0"`) rely on `title` for mouse tooltips, but screen readers require an explicit `aria-label` attribute on the `td` element to announce the cell's action when focused via keyboard navigation.
**Action:** Always mirror actionable `title` text onto `aria-label` when converting table cells (`td`) into focusable keyboard buttons.
