import { DeviceData, DeviceTableCardConfig } from './types';

const FORBIDDEN_PROPS = new Set(['__proto__', 'constructor', 'prototype']);
const ALLOWED_DEVICE_PROPS = new Set(['model', 'sw_version', 'hw_version']);

interface ConfigCacheEntry {
  entityCols: any[];
  deviceCols: any[];
  metaCols: any[];
  suffixCols: any[];
  requiredClasses: Set<string>;
  needsLastChanged: boolean;
}

// Performance Optimization: Cache pre-categorized column schema based on stable config reference.
// This avoids repeated schema iteration, branching, and Set/array allocations during frequent state updates.
const configCache = new WeakMap<DeviceTableCardConfig, ConfigCacheEntry>();

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

  let cache = configCache.get(config);
  if (!cache) {
    const columns = config.columns || [];
    const entityCols = [];
    const deviceCols = [];
    const metaCols = [];
    const suffixCols = [];
    const requiredClasses = new Set<string>();
    let needsLastChanged = false;

    if (filter.anchor_entity_class) {
      requiredClasses.add(filter.anchor_entity_class);
    }

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const m: any = { col, key: `col_${i}` };
      if (col.type === 'entity') {
        entityCols.push(m);
        if (col.suffix) suffixCols.push(m);
        if (col.device_class) requiredClasses.add(col.device_class);
      } else if (col.type === 'device') {
        const prop = col.prop;
        if (typeof prop === 'string' && FORBIDDEN_PROPS.has(prop)) {
          m.strategy = 'forbidden';
        } else if (
          prop === 'name' ||
          prop === 'area' ||
          prop === 'integration' ||
          prop === 'manufacturer'
        ) {
          m.strategy = prop;
        } else if (typeof prop === 'string' && ALLOWED_DEVICE_PROPS.has(prop)) {
          m.strategy = 'allowed';
          m.prop = prop;
        } else {
          m.strategy = 'unknown';
        }
        deviceCols.push(m);
      } else if (col.type === 'meta') {
        metaCols.push(m);
        if (col.prop === 'last_changed') needsLastChanged = true;
      }
    }

    cache = {
      entityCols,
      deviceCols,
      metaCols,
      suffixCols,
      requiredClasses,
      needsLastChanged,
    };
    configCache.set(config, cache);
  }

  const { entityCols, deviceCols, metaCols, suffixCols, requiredClasses, needsLastChanged } = cache;

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
    let matchedSuffixesCount = 0;
    let latestIso: string | null = null;
    let hasAnchor = !anchorClass;
    let hasValidEntities = false;

    for (let j = 0; j < deviceEntitiesRaw.length; j++) {
      const ent = deviceEntitiesRaw[j];
      const stateObj = states[ent.entity_id];
      if (!stateObj) continue;

      hasValidEntities = true;

      // Match by Device Class
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
      if (matchedSuffixesCount < suffixCols.length) {
        for (let k = 0; k < suffixCols.length; k++) {
          const { col, key } = suffixCols[k];
          if (!entitiesBySuffix[key] && ent.entity_id.endsWith(col.suffix!)) {
            entitiesBySuffix[key] = stateObj;
            matchedSuffixesCount++;
          }
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
      const m = deviceCols[i];
      const { key, strategy } = m;

      if (strategy === 'name') deviceData[key] = deviceData.name;
      else if (strategy === 'area') deviceData[key] = deviceData.area;
      else if (strategy === 'integration') deviceData[key] = deviceData.integration;
      else if (strategy === 'manufacturer') deviceData[key] = deviceData.manufacturer;
      else if (strategy === 'allowed') {
        deviceData[key] = (d as any)?.[m.prop] || '-';
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
