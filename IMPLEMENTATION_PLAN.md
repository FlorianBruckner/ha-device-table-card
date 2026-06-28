# Implementation Plan: HA Device Table Card

This document outlines the work packages for implementing the Device Table Card for Home Assistant.

## Overview
The goal is to create a HACS-compatible dashboard card that displays a table of devices. Each row represents a device, and columns are configurable to show device properties or specific entity states.

## Work Package 1: Build Pipeline & Basic Structure
- **Objective**: Set up a robust build and bundling process.
- **Tasks**:
  - Configure `rollup.config.js` to bundle dependencies (`lit`, `jquery`, `datatables.net`) into a single `dist/device-table-card.js`.
  - Configure `tsconfig.json` for TypeScript.
  - Set up a boilerplate `LitElement` class in `src/device-table-card.ts`.
  - Define basic `hacs.json`.

## Work Package 2: Data Fetching & Processing Logic
- **Objective**: Implement the logic to transform Home Assistant's state machine into a device-oriented data structure.
- **Tasks**:
  - Implement filtering logic: Filter devices by area and/or the presence of an "anchor" entity (by `device_class`).
  - Implement entity resolution: For each device, find relevant entities based on `device_class` or `entity_id` suffix.
  - Implement meta-property calculation: Calculate the "last changed" timestamp across all entities belonging to a device.
  - Create TypeScript interfaces for the internal data model.

## Work Package 3: UI Rendering (Lit)
- **Objective**: Create the HTML structure for the card.
- **Tasks**:
  - Implement the `render()` method to output a standard HTML table (`<table>`).
  - Handle card configuration updates (`setConfig`).
  - Create a basic "Editor" UI (optional but recommended) or document the YAML schema.

## Work Package 4: DataTables.net Integration
- **Objective**: Bring the table to life with sorting, searching, and responsiveness.
- **Tasks**:
  - Initialize DataTables on the rendered table element.
  - Configure the `Responsive` extension for mobile support.
  - Implement the "Search" and "Pagination" features.
  - Handle data updates: Ensure the table refreshes correctly when Home Assistant states change without a full re-render if possible.

## Work Package 5: Highlighting & Formatting
- **Objective**: Add visual cues for data.
- **Tasks**:
  - Implement numeric threshold highlighting (e.g., yellow for < 20, red for < 10).
  - Use DataTables' `createdCell` or `rowCallback` for efficient styling.
  - Format "last changed" as relative time (e.g., "5 mins ago").

## Work Package 6: Interactivity & HA Navigation
- **Objective**: Connect the table to the rest of Home Assistant.
- **Tasks**:
  - Add click handlers to entity columns to open the "more-info" dialog (`fireEvent(this, "hass-more-info", ...)`).
  - Add click handlers to device columns to navigate to the Device Settings page.
  - Ensure compatibility with Home Assistant themes (using CSS variables).

## YAML Configuration Schema (Proposed)
```yaml
type: custom:ha-device-table-card
filter:
  area: "Garden"
  anchor_device_class: "moisture"
columns:
  - type: device
    prop: name
    label: "Device Name"
  - type: entity
    device_class: "moisture"
    label: "Moisture"
    highlight:
      - below: 20
        color: "red"
      - below: 40
        color: "yellow"
  - type: entity
    suffix: "_battery"
    label: "Battery"
  - type: meta
    prop: last_changed
    label: "Last Seen"
```
