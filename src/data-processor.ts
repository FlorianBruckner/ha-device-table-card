import { DeviceData, DeviceTableCardConfig } from './types';

const FORBIDDEN_PROPS = new Set(['__proto__', 'constructor', 'prototype']);
const ALLOWED_DEVICE_PROPS = new Set(['model', 'sw_version', 'hw_version']);

export function processDevices(
  hass: any,
  config: DeviceTableCardConfig,
  devices: any[],
  entitiesByDevice: Map<string, any[]>,
  areaLookup: Record<string, string>,
): DeviceData[] {
  if (!hass || !config || devices.length === 0) {
    return [];
  }

  const states = hass.states || {};
  const filter = config.filter || {};
  const columns = config.columns || [];

  // Pre-categorize columns and calculate requirements once per call
  const entityCols: any[] = [];
  const deviceCols: any[] = [];
  const metaCols: any[] = [];
  const suffixCols: any[] = [];
  const requiredClasses = new Set<string>();
  let needsLastChanged = false;

  if (filter.anchor_entity_class) requiredClasses.add(filter.anchor_entity_class);

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const m = { col, key: `col_${i}` };
    if (col.type === 'entity') {
      entityCols.push(m);
      if (col.suffix) suffixCols.push(m);
      if (col.device_class) requiredClasses.add(col.device_class);
    } else if (col.type === 'device') {
      deviceCols.push(m);
    } else if (col.type === 'meta') {
      metaCols.push(m);
      if (col.prop === 'last_changed') needsLastChanged = true;
    }
  }

  const result: DeviceData[] = [];
  const anchorClass = filter.anchor_entity_class;

  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];

    // 1. Manufacturer filter
    const manufacturer = d.manufacturer || 'Unknown';
    if (filter.manufacturer && manufacturer !== filter.manufacturer) {
      continue;
    }

    // 2. Area filter
    const areaId = d.area_id;
    const areaName = areaId ? areaLookup[areaId] || areaId : 'No Area';
    if (filter.area && areaName !== filter.area && areaId !== filter.area) {
      continue;
    }

    const deviceId = d.id;
    const deviceEntitiesRaw = entitiesByDevice.get(deviceId);
    if (!deviceEntitiesRaw || deviceEntitiesRaw.length === 0) {
      continue;
    }

    // 3. Integration filter (using the first entity's platform as proxy for device integration)
    const integration = deviceEntitiesRaw[0].platform || 'Unknown';
    if (filter.integration && integration !== filter.integration) {
      continue;
    }

    // Single pass: Resolve states, match entities by device_class/suffix, find latest update, and check anchor filter
    const entitiesByClass: Record<string, any> = {};
    const entitiesBySuffix: Record<string, any> = {};
    let latestIso: string | null = null;
    let hasAnchor = !anchorClass;
    let hasValidEntities = false;

    for (let j = 0; j < deviceEntitiesRaw.length; j++) {
      const ent = deviceEntitiesRaw[j];
      const stateObj = states[ent.entity_id];
      if (!stateObj) continue;

      hasValidEntities = true;

      // Match by Device Class - only if required by config or anchor
      const dClass = stateObj.attributes.device_class || ent.device_class;
      if (dClass && requiredClasses.has(dClass)) {
        if (!entitiesByClass[dClass]) {
          entitiesByClass[dClass] = stateObj;
        }
        if (!hasAnchor && dClass === anchorClass) {
          hasAnchor = true;
        }
      }

      // Match by Suffix (pre-calculated columns)
      for (let k = 0; k < suffixCols.length; k++) {
        const { col, key } = suffixCols[k];
        if (!entitiesBySuffix[key] && ent.entity_id.endsWith(col.suffix!)) {
          entitiesBySuffix[key] = stateObj;
        }
      }

      if (needsLastChanged) {
        const iso = stateObj.last_updated;
        if (iso && (latestIso === null || iso > latestIso)) {
          latestIso = iso;
        }
      }
    }

    if (!hasAnchor || !hasValidEntities) continue;

    const lastChanged = needsLastChanged && latestIso ? Date.parse(latestIso) : null;

    const deviceData: DeviceData = {
      id: deviceId,
      name: d.name_by_user || d.name || 'Unknown Device',
      area: areaName,
      integration: integration,
      manufacturer: manufacturer,
      _entities: {},
    };

    // Resolve Device Columns
    for (let i = 0; i < deviceCols.length; i++) {
      const { col, key } = deviceCols[i];
      const prop = col.prop;

      if (FORBIDDEN_PROPS.has(prop)) {
        deviceData[key] = '-';
      } else if (prop === 'name') {
        deviceData[key] = deviceData.name;
      } else if (prop === 'area') {
        deviceData[key] = deviceData.area;
      } else if (prop === 'integration') {
        deviceData[key] = deviceData.integration;
      } else if (prop === 'manufacturer') {
        deviceData[key] = deviceData.manufacturer;
      } else if (ALLOWED_DEVICE_PROPS.has(prop)) {
        deviceData[key] = (d as any)?.[prop] || '-';
      } else {
        deviceData[key] = '-';
      }
    }

    // Resolve Entity Columns
    for (let i = 0; i < entityCols.length; i++) {
      const { col, key } = entityCols[i];
      let stateObj = null;
      if (col.device_class) {
        stateObj = entitiesByClass[col.device_class];
      } else if (col.suffix) {
        stateObj = entitiesBySuffix[key];
      }

      if (stateObj) {
        deviceData[key] = stateObj.state;
        deviceData._entities[key] = stateObj;
      } else {
        deviceData[key] = '-';
      }
    }

    // Resolve Meta Columns
    if (metaCols.length > 0) {
      for (let i = 0; i < metaCols.length; i++) {
        const { col, key } = metaCols[i];
        if (col.prop === 'last_changed') {
          deviceData[key] = lastChanged !== null ? lastChanged : '-';
        }
      }
    }

    result.push(deviceData);
  }

  return result;
}
