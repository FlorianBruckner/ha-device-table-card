## 2025-05-18 - Deterministic Form Input IDs in Shadow DOM Lit Components
**Learning:** Generating native `<input id="...">` using `Math.random()` inside Lit render methods breaks persistent `<label for="...">` and `aria-describedby` focus/screen-reader bindings on re-render.
**Action:** Pass explicit, deterministic field context/suffixes (e.g. `col-0-hl-0-below`) to `_renderInput` helpers so generated element IDs remain consistent across state updates.
