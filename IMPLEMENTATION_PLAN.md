# Implementation Plan: HA Device Table Card

This document serves as the comprehensive blueprint for the `ha-device-table-card`, a Home Assistant dashboard component.

## Core Objectives
The primary goal is to provide a high-density, customizable table view of Home Assistant **devices** (not just individual entities). This is particularly useful for managing groups of similar hardware, such as soil moisture sensors, battery-powered temperature sensors, or smart plugs.

### Key Functional Requirements
1.  **Device-Centric Rows**: Each row in the table represents a single Home Assistant Device.
2.  **Flexible Column Mapping**: Columns can display device-level properties (Name, Area) or state/attributes from specific entities belonging to that device.
3.  **Smart Filtering (Anchor Entities)**: The table is populated by identifying "anchor" entities. For example, "show all devices that have a `moisture` sensor".
4.  **Meta-Properties**: Support for derived data, specifically "Last Seen" (minutes ago), calculated as the most recent update across *any* entity associated with the device. This helps identify "ghost" devices that HA reports as available but are no longer communicating.
5.  **Threshold Highlighting**: Visual alerts (e.g., yellow for < 20, red for < 10) for numeric values to highlight low battery, low moisture, etc.
6.  **Advanced UI Features**: Leverages `DataTables.net` for client-side sorting, searching, and mobile responsiveness.
7.  **HA Integration**: Deep links to "More Info" dialogs for entities and the Device Settings page for devices.

---

## Architecture & Design Decisions

### 1. Data Transformation Logic
-   **Device Discovery**: The card will iterate through the HA state machine (`hass.states`) and the device registry (if available via `hass.devices`) to group entities by `device_id`.
-   **Anchor-Based Filtering**: The user specifies a `filter`. A device is included in the table if it satisfies the filter (e.g., belongs to area "Garden" AND has at least one entity with `device_class: moisture`).
-   **Entity Resolution for Columns**: Since a device has multiple entities, the card finds the correct entity for a column using:
    -   `device_class`: Match an entity with a specific class (e.g., `battery`).
    -   `suffix`: Match an entity whose `entity_id` ends with a specific string (e.g., `_voltage`).
-   **Last Update Calculation**: The `last_changed` or `last_updated` timestamps of all entities linked to a device are compared. The most recent one is used as the "Device Last Seen" value.

### 2. Technology Stack
-   **LitElement**: The base for the custom web component, providing reactive updates when `hass` changes.
-   **jQuery + DataTables.net**: Used for the heavy lifting of table management.
-   **No CDN**: All dependencies are bundled via Rollup to ensure the card works in offline/firewalled environments and complies with HACS recommendations.
-   **Responsive Extension**: Uses the DataTables Responsive extension with the "plus-button" (child row) behavior for mobile screens.

### 3. Interaction Model
-   **Entity Columns**: Clicking a cell that displays an entity state will trigger the `hass-more-info` event for that specific entity.
-   **Device Columns**: Clicking a cell displaying device properties (like Name) will navigate the browser to the Home Assistant device configuration page (`/config/devices/device/DEVICE_ID`).

---

## Work Packages

### Work Package 1: Build Pipeline & Basic Structure
-   Set up `rollup.config.js` to bundle `Lit`, `jQuery`, and `DataTables.net` (including the responsive extension and CSS).
-   Define `hacs.json` and basic project metadata.
-   Create a TypeScript boilerplate for `DeviceTableCard`.

### Work Package 2: Home Assistant Data Processing
-   Implement the `processDevices(hass, config)` function.
-   Logic to group entities by device.
-   Implement the filtering logic (Area, Anchor Entity).
-   Implement the "Last Seen" calculation across device entities.
-   Implement the Entity Resolver (match by `device_class` or `suffix`).

### Work Package 3: Table Rendering & DataTables Integration
-   Render the base `<table>` structure in Lit's `render()`.
-   Initialize/Destroy DataTables in the `firstUpdated` and `updated` lifecycle methods.
-   Map the processed device data to DataTables rows.
-   Enable Search, Sorting, and the Responsive extension.

### Work Package 4: Highlighting & Formatting
-   Implement a formatting engine for numeric cells.
-   Support YAML-defined thresholds:
    ```yaml
    highlight:
      - below: 20
        color: "var(--error-color)" # Red
      - below: 40
        color: "var(--warning-color)" # Yellow
    ```
-   Implement a relative time formatter (e.g., `15 min ago`) that refreshes periodically.

### Work Package 5: Navigation & Styling
-   Attach event listeners to table rows/cells for HA navigation.
-   Apply CSS to make DataTables match the Home Assistant theme (backgrounds, fonts, border colors).

---

## Proposed YAML Configuration Example
```yaml
type: custom:ha-device-table-card
filter:
  area: "Garden"
  anchor_entity_class: "moisture"
columns:
  - type: device
    prop: name
    label: "Sensor Name"
  - type: entity
    device_class: "moisture"
    label: "Moisture (%)"
    highlight:
      - below: 20
        color: "red"
      - below: 50
        color: "yellow"
  - type: entity
    device_class: "battery"
    label: "Battery"
    highlight:
      - below: 15
        color: "red"
  - type: meta
    prop: last_changed
    label: "Last Seen"
```
