## 2026-08-05 - [Escape Key Blur on Empty Search Inputs]
**Learning:** For custom-built search interfaces where active inputs are cleared with a custom cancel button or an `Escape` key handler, when the user presses `Escape` on an already empty search input, they expect the input to unfocus (`blur()`) to return keyboard focus back to the page context.
**Action:** When implementing custom styled search keydown handlers, ensure that pressing `Escape` on an empty textfield blurs focus gracefully.

## 2026-08-05 - [Accessible Disabled State Messaging on Pagination Components]
**Learning:** Dynamic pagination buttons in complex widgets often transition between interactive and non-interactive (disabled) states. For screen readers, simply appending standard raw characters is not enough. Dynamically modifying `aria-disabled="true"` and appending "(disabled)" context directly onto the button's `aria-label` ensures screen reader users are kept fully aware of inactive boundaries.
**Action:** Always pair `aria-disabled="true"` with specific disabled-state text suffixes (e.g. "(disabled)") on pagination buttons when they become inactive.

## 2026-08-05 - [Explicit Color Context on Interactive Swatches]
**Learning:** Visual color-preview swatches in dashboard configuration editors require contextual feedback for screen reader and keyboard-only users. Presenting a static tooltip such as "Color preview" is less informative than dynamic tooltips containing the actual whitelisted value, such as "Color preview: red".
**Action:** When showing custom style or color swatches, dynamically append the whitelisted/sanitized color parameter value onto the `title` and `aria-label` attributes to maximize descriptive context.
