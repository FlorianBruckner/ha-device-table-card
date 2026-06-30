# Device Table Card

A Home Assistant dashboard card that displays devices in a table format using [DataTables.net](https://datatables.net/).

## Core Objectives

The primary goal is to provide a high-density, customizable table view of Home Assistant **devices** (not just individual entities). This is particularly useful for managing groups of similar hardware, such as soil moisture sensors, battery-powered temperature sensors, or smart plugs.

### Key Functional Requirements

- **Device-Centric Rows**: Each row in the table represents a single Home Assistant Device.
- **Flexible Column Mapping**: Columns can display device-level properties (Name, Area) or state/attributes from specific entities belonging to that device.
- **Smart Filtering (Anchor Entities)**: The table is populated by identifying "anchor" entities. For example, "show all devices that have a `moisture` sensor".
- **Meta-Properties**: Support for derived data, specifically "Last Seen" (minutes ago), calculated as the most recent update across *any* entity associated with the device. This helps identify "ghost" devices that HA reports as available but are no longer communicating.
- **Threshold Highlighting**: Visual alerts (e.g., yellow for < 20, red for < 10) for numeric values to highlight low battery, low moisture, etc.
- **Advanced UI Features**: Leverages `DataTables.net` for client-side sorting, searching, and mobile responsiveness.
- **HA Integration**: Deep links to "More Info" dialogs for entities and the Device Settings page for devices.

## Architecture & Design Decisions

### 1. Data Transformation Logic

- **Device Discovery**: The card iterates through the HA state machine (`hass.states`) and the registries to group entities by `device_id`.
- **Anchor-Based Filtering**: A device is included if it satisfies the filter (e.g., belongs to area "Garden" AND has at least one entity with `device_class: moisture`).
- **Entity Resolution for Columns**: The card finds the correct entity for a column using `device_class` or `suffix` matching.
- **Last Update Calculation**: The most recent `last_updated` timestamp across all entities linked to a device is used as the "Device Last Seen" value.

### 2. Technology Stack

- **Lit**: The base for the custom web component.
- **jQuery + DataTables.net**: Used for table management. All dependencies are bundled via Rollup.
- **Responsive Extension**: Provides mobile-friendly behavior.

### 3. Interaction Model

- **Entity Columns**: Clicking a cell triggers the `hass-more-info` event.
- **Device Columns**: Clicking a cell navigates to the Home Assistant device configuration page.

## Configuration Example

```yaml
type: custom:ha-device-table-card
filter:
  area: 'Garden'
  anchor_entity_class: 'moisture'
columns:
  - type: device
    prop: name
    label: 'Sensor Name'
  - type: entity
    device_class: 'moisture'
    label: 'Moisture (%)'
    highlight:
      - below: 20
        color: 'red'
      - below: 50
        color: 'yellow'
  - type: entity
    device_class: 'battery'
    label: 'Battery'
    highlight:
      - below: 15
        color: 'red'
  - type: meta
    prop: last_changed
    label: 'Last Seen'
```

## Development

- `npm run build`: Build the project.
- `npm run lint`: Run ESLint.
- `npm run format:check`: Check formatting with Prettier.
- `npm run test`: Run unit tests with Vitest.
