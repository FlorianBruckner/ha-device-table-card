# Device Table Card

A Home Assistant dashboard card that displays devices in a responsive table format using [DataTables.net](https://datatables.net/).

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=FlorianBruckner&repository=ha-device-table-card&category=plugin)

## Features

- **Device-centric view**: Each row represents a single Home Assistant device, making it easy to manage groups of similar hardware (e.g., soil moisture sensors, smart plugs).
- **Flexible Column Mapping**: Display device-level properties (Name, Area, Integration) or state/attributes from specific entities belonging to that device.
- **Smart Filtering**: Populate the table by area, integration, or "anchor" entities (e.g., "show all devices that have a moisture sensor").
- **Meta-properties**: Display derived data like "Last Seen", calculated as the most recent update across all entities associated with the device.
- **Threshold Highlighting**: Visually highlight numeric values (e.g., low battery or high temperature) using configurable colors and bold weights.
- **Sorting & Search**: Full client-side sorting and searching capabilities.
- **Responsive Design**: Mobile-friendly layout using the DataTables Responsive extension.
- **HA Integration**: Deep links to "More Info" dialogs for entities and the Device Settings page for devices.

## Installation

1. Download `ha-device-table-card.js` from the latest release.
2. Place it in your Home Assistant `www/` directory.
3. Add the resource to your dashboard.

Alternatively, add this repository to HACS as a custom repository.

## Configuration

### Main Options

| Name | Type | Requirement | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | **Required** | `custom:ha-device-table-card` |
| `title` | string | Optional | Title of the card. |
| `filter` | object | Optional | Filtering criteria for devices. |
| `columns` | list | Optional | List of column definitions. |

### Filter Object

| Name | Type | Description |
| :--- | :--- | :--- |
| `area` | string | Only show devices in this area. |
| `integration` | string | Only show devices from this integration (manufacturer/model). |
| `anchor_entity_class` | string | Only show devices that have an entity with this `device_class`. |

### Column Object

| Name | Type | Description |
| :--- | :--- | :--- |
| `type` | string | `device`, `entity`, or `meta`. |
| `label` | string | Header text for the column. |
| `prop` | string | Property name for `device` (e.g., `name`, `area`, `integration`) or `meta` (e.g., `last_changed`). |
| `device_class` | string | Used for `entity` type to find an entity by its device class (e.g., `battery`, `moisture`). |
| `suffix` | string | Used for `entity` type to find an entity by its entity ID suffix (e.g., `_voltage`). |
| `highlight` | list | List of highlighting rules. |

### Highlight Rule

| Name | Type | Description |
| :--- | :--- | :--- |
| `below` | number | Highlight if the value is below this number. |
| `above` | number | Highlight if the value is above this number. |
| `color` | string | CSS color to apply. |

## Example Configuration

```yaml
type: custom:ha-device-table-card
title: "Garden Sensors"
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
        color: "var(--error-color)"
      - below: 50
        color: "var(--warning-color)"
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

## Development

### Setup
```bash
npm install
```

### Build
```bash
npm run build
```

### Testing
```bash
npm test
```

### Linting & Formatting
```bash
npm run lint
npm run format:check
```
