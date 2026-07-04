# Device Table Card

A Home Assistant dashboard card that displays devices in a table format using [DataTables.net](https://datatables.net/).

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=FlorianBruckner&repository=ha-device-table-card&category=plugin)

## Features

- **Device-centric view**: One row per device.
- **Selectable columns**: Choose which properties or entities to display.
- **Meta-properties**: Display information like "last updated" (time since last change of any device entity).
- **Threshold Highlighting**: Color-code numeric values based on configurable thresholds.
- **Sorting & Search**: Built-in DataTables functionality.
- **Responsive**: Mobile-friendly view with the Responsive extension.
- **Visual Editor**: Easy configuration of title and filters via the dashboard UI.

## Installation

### HACS (Recommended)

1. Ensure [HACS](https://hacs.xyz/) is installed.
2. Go to **HACS** -> **Frontend**.
3. Click the three dots in the top right corner and select **Custom repositories**.
4. Paste the URL of this repository: `https://github.com/FlorianBruckner/ha-device-table-card`
5. Select **Lovelace** (or **Plugin**) as the category and click **Add**.
6. Find **Device Table Card** in the list and click **Download**.
7. Reload your browser.

### Manual

1. Download the `device-table-card.js` from the [latest release](https://github.com/FlorianBruckner/ha-device-table-card/releases/latest).
2. Copy the file into your `<config>/www/` directory.
3. Add the resource in Home Assistant:
   - Go to **Settings** -> **Dashboards**.
   - Click the three dots in the top right and select **Resources**.
   - Click **Add Resource**.
   - Set **URL** to `/local/device-table-card.js` and **Resource type** to `JavaScript Module`.

## Configuration

The card can be configured via the visual editor or manually in YAML.

### YAML Example

```yaml
type: custom:ha-device-table-card
title: My Sensors
filter:
  area: "Garden"
  anchor_entity_class: "moisture"
  integration: "Zigbee2MQTT"
columns:
  - type: device
    prop: name
    label: "Name"
  - type: entity
    device_class: "moisture"
    label: "Moisture"
    highlight:
      - below: 20
        color: "red"
  - type: meta
    prop: last_changed
    label: "Seen"
```

### Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `type` | string | **Required** | `custom:ha-device-table-card` |
| `title` | string | Optional | Card title. |
| `filter` | object | Optional | Filtering options (see below). |
| `columns` | list | Optional | List of column definitions. |

#### Filter Options

| Option | Type | Description |
| :--- | :--- | :--- |
| `area` | string | Filter devices by area name. |
| `anchor_entity_class` | string | Only show devices that have an entity with this `device_class`. |
| `integration` | string | Filter by manufacturer or model. |

#### Column Definitions

| Option | Type | Description |
| :--- | :--- | :--- |
| `type` | string | `device`, `entity`, or `meta`. |
| `prop` | string | For `device`: `name`, `area`, `integration`, or other registry props. For `meta`: `last_changed`. |
| `device_class` | string | For `entity`: Match by `device_class`. |
| `suffix` | string | For `entity`: Match by `entity_id` suffix (e.g., `_voltage`). |
| `label` | string | Column header text. |
| `highlight` | list | Threshold highlighting rules. |

---

*This project was fully implemented with the assistance of [Jules](https://jules.google.com).*
