import { DeviceData, DeviceTableCardConfig } from './types';

export function processDevices(
  hass: any,
  config: DeviceTableCardConfig,
  devices: any[],
  entities: any[] | Map<string, any[]>,
  areas: any[],
): DeviceData[] {
  if (!hass || !config || devices.length === 0) {
    return [];
  }

  const states = hass.states || {};
  const filter = config.filter || {};
  const columns = config.columns || [];

  // Create area lookup
  const areaLookup: Record<string, string> = {};
  for (let i = 0; i < areas.length; i++) {
    areaLookup[areas[i].area_id] = areas[i].name;
  }

  // Pre-filter devices by Manufacturer and Area to avoid processing their entities
  const filteredDevices: Record<string, { d: any; areaName: string }> = {};
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

    filteredDevices[d.id] = { d, areaName };
  }

  const deviceMap: Record<string, any[]> = {};
  const devicePlatform: Record<string, string> = {};

  if (entities instanceof Map) {
    // Optimized path: Use the pre-grouped Map
    for (const deviceId in filteredDevices) {
      const registryEntities = entities.get(deviceId);
      if (!registryEntities) continue;

      let platform = null;
      const deviceEntities = [];

      for (let i = 0; i < registryEntities.length; i++) {
        const ent = registryEntities[i];
        const stateObj = states[ent.entity_id];
        if (!stateObj) continue;

        if (platform === null) {
          platform = ent.platform || 'Unknown';
          if (filter.integration && platform !== filter.integration) {
            break;
          }
        }

        deviceEntities.push({
          entity_id: ent.entity_id,
          state: stateObj,
          registry: ent,
        });
      }

      if (deviceEntities.length > 0 && platform !== null) {
        if (filter.integration && platform !== filter.integration) {
          continue;
        }
        deviceMap[deviceId] = deviceEntities;
        devicePlatform[deviceId] = platform;
      }
    }
  } else {
    // Legacy path: Group entities by device
    const rejectedDevices = new Set<string>();
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      const deviceId = ent.device_id;

      if (!deviceId || !filteredDevices[deviceId] || rejectedDevices.has(deviceId)) {
        continue;
      }

      const stateObj = states[ent.entity_id];
      if (!stateObj) continue;

      const platform = ent.platform || 'Unknown';
      if (!deviceMap[deviceId]) {
        // This is the "primary" entity for this device in our processing
        if (filter.integration && platform !== filter.integration) {
          rejectedDevices.add(deviceId);
          continue;
        }
        deviceMap[deviceId] = [];
        devicePlatform[deviceId] = platform;
      }

      deviceMap[deviceId].push({
        entity_id: ent.entity_id,
        state: stateObj,
        registry: ent, // Keep registry for device_class
      });
    }
  }

  // Pre-categorize columns to avoid repeated checks in the loop
  const entityCols = [];
  const deviceCols = [];
  const metaCols = [];
  for (let i = 0; i < columns.length; i++) {
    const m = { col: columns[i], key: `col_${i}` };
    if (m.col.type === 'entity') entityCols.push(m);
    else if (m.col.type === 'device') deviceCols.push(m);
    else if (m.col.type === 'meta') metaCols.push(m);
  }

  const result: DeviceData[] = [];
  for (const deviceId in deviceMap) {
    const deviceEntities = deviceMap[deviceId];
    const { d, areaName } = filteredDevices[deviceId];

    // Single pass: index entities by device_class, find latest update, and check anchor filter
    const entitiesByClass: Record<string, any> = {};
    let latestIso: string | null = null;
    let hasAnchor = !filter.anchor_entity_class;

    for (let i = 0; i < deviceEntities.length; i++) {
      const e = deviceEntities[i];
      const stateObj = e.state;
      const dClass = stateObj.attributes.device_class || e.registry.device_class;

      if (dClass) {
        if (!entitiesByClass[dClass]) {
          entitiesByClass[dClass] = e;
        }
        if (!hasAnchor && dClass === filter.anchor_entity_class) {
          hasAnchor = true;
        }
      }

      const iso = stateObj.last_updated;
      if (iso && (latestIso === null || iso > latestIso)) {
        latestIso = iso;
      }
    }

    if (!hasAnchor) continue;

    const lastChanged = latestIso ? Date.parse(latestIso) : null;
    const integration = devicePlatform[deviceId];

    const deviceData: DeviceData = {
      id: deviceId,
      name: d.name_by_user || d.name || 'Unknown Device',
      area: areaName,
      integration: integration,
      manufacturer: d.manufacturer || 'Unknown',
      _entities: {},
    };

    // Resolve Device Columns
    for (let i = 0; i < deviceCols.length; i++) {
      const { col, key } = deviceCols[i];
      if (col.prop === 'name') deviceData[key] = deviceData.name;
      else if (col.prop === 'area') deviceData[key] = deviceData.area;
      else if (col.prop === 'integration') deviceData[key] = deviceData.integration;
      else if (col.prop === 'manufacturer') deviceData[key] = deviceData.manufacturer;
      else deviceData[key] = (d as any)?.[col.prop as string] || '-';
    }

    // Resolve Entity Columns
    for (let i = 0; i < entityCols.length; i++) {
      const { col, key } = entityCols[i];
      let found = null;
      if (col.device_class) {
        found = entitiesByClass[col.device_class];
      } else if (col.suffix) {
        const suffix = col.suffix;
        for (let j = 0; j < deviceEntities.length; j++) {
          if (deviceEntities[j].entity_id.endsWith(suffix)) {
            found = deviceEntities[j];
            break;
          }
        }
      }

      if (found) {
        deviceData[key] = found.state.state;
        deviceData._entities[key] = found.state;
      } else {
        deviceData[key] = '-';
      }
    }

    // Resolve Meta Columns
    for (let i = 0; i < metaCols.length; i++) {
      const { col, key } = metaCols[i];
      if (col.prop === 'last_changed') {
        deviceData[key] = lastChanged !== null ? lastChanged : '-';
      }
    }

    result.push(deviceData);
  }

  return result;
}
