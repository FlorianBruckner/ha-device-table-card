import { DeviceData, DeviceTableCardConfig } from './types';

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
  const entityCols = [];
  const deviceCols = [];
  const metaCols = [];
  let needsLastChanged = false;

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const m = { col, key: `col_${i}` };
    if (col.type === 'entity') {
      entityCols.push(m);
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

    // Single pass: Resolve states, index entities by device_class, find latest update, and check anchor filter
    const deviceEntities = [];
    const entitiesByClass: Record<string, any> = {};
    let latestIso: string | null = null;
    let hasAnchor = !anchorClass;

    for (let j = 0; j < deviceEntitiesRaw.length; j++) {
      const ent = deviceEntitiesRaw[j];
      const stateObj = states[ent.entity_id];
      if (!stateObj) continue;

      const processedEntity = {
        entity_id: ent.entity_id,
        state: stateObj,
        registry: ent,
      };
      deviceEntities.push(processedEntity);

      const dClass = stateObj.attributes.device_class || ent.device_class;
      if (dClass) {
        if (!entitiesByClass[dClass]) {
          entitiesByClass[dClass] = processedEntity;
        }
        if (!hasAnchor && dClass === anchorClass) {
          hasAnchor = true;
        }
      }

      if (needsLastChanged) {
        const iso = stateObj.last_updated;
        if (iso && (latestIso === null || iso > latestIso)) {
          latestIso = iso;
        }
      }
    }

    if (!hasAnchor || deviceEntities.length === 0) continue;

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
      if (prop === 'name') deviceData[key] = deviceData.name;
      else if (prop === 'area') deviceData[key] = deviceData.area;
      else if (prop === 'integration') deviceData[key] = deviceData.integration;
      else if (prop === 'manufacturer') deviceData[key] = deviceData.manufacturer;
      else deviceData[key] = (d as any)?.[prop as string] || '-';
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
