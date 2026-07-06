import { DeviceData, DeviceTableCardConfig } from './types';

export function processDevices(
  hass: any,
  config: DeviceTableCardConfig,
  devices: any[],
  entities: any[],
  areas: any[],
): DeviceData[] {
  if (!hass || !config || devices.length === 0) {
    return [];
  }

  const states = hass.states || {};

  // Create lookups for faster processing
  const deviceLookup: Record<string, any> = {};
  for (let i = 0; i < devices.length; i++) {
    const d = devices[i];
    deviceLookup[d.id] = d;
  }

  const areaLookup: Record<string, any> = {};
  for (let i = 0; i < areas.length; i++) {
    const a = areas[i];
    areaLookup[a.area_id] = a;
  }

  const deviceMap: Record<string, any[]> = {};

  // Group entities by device using registries first
  for (let i = 0; i < entities.length; i++) {
    const entityRegistry = entities[i];
    const entityId = entityRegistry.entity_id;
    const stateObj = states[entityId];
    const deviceId = entityRegistry.device_id;

    if (deviceId && stateObj) {
      if (!deviceMap[deviceId]) {
        deviceMap[deviceId] = [];
      }
      deviceMap[deviceId].push({
        entity_id: entityId,
        state: stateObj,
        registry: entityRegistry,
      });
    }
  }

  const result: DeviceData[] = [];
  const columns = config?.columns || [];
  const filter = config?.filter || {};

  // Cache column metadata
  const columnMetadata = columns.map((col, index) => ({
    col,
    key: `col_${index}`,
  }));

  for (const deviceId in deviceMap) {
    const deviceEntities = deviceMap[deviceId];
    const device = deviceLookup[deviceId];

    // 1. Early filter by Manufacturer
    const manufacturer = device?.manufacturer || 'Unknown';
    if (filter.manufacturer && manufacturer !== filter.manufacturer) {
      continue;
    }

    // 2. Early filter by Area
    const deviceAreaId = device?.area_id;
    const areaName = deviceAreaId ? areaLookup[deviceAreaId]?.name || deviceAreaId : 'No Area';
    if (filter.area && areaName !== filter.area && deviceAreaId !== filter.area) {
      continue;
    }

    // 3. Early filter by Integration
    const integration = deviceEntities[0]?.registry?.platform || 'Unknown';
    if (filter.integration && integration !== filter.integration) {
      continue;
    }

    // Index entities by device_class for faster column resolution
    // AND find latest last_updated (using lexicographical string comparison)
    // AND check for anchor entity filter
    const entitiesByClass: Record<string, any> = {};
    let latestIso: string | null = null;
    let hasAnchor = filter.anchor_entity_class ? false : true;

    for (let i = 0; i < deviceEntities.length; i++) {
      const e = deviceEntities[i];
      const stateObj = e.state;
      const dClass = stateObj.attributes.device_class;

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

    // 4. Anchor Entity Filter check
    if (!hasAnchor) {
      continue;
    }

    // Parse the final latest timestamp only once
    const lastChanged = latestIso ? Date.parse(latestIso) : null;

    const deviceData: DeviceData = {
      id: deviceId,
      name: device?.name_by_user || device?.name || 'Unknown Device',
      area: areaName,
      integration: integration,
      manufacturer: manufacturer,
      _entities: {},
    };

    // Resolve Columns
    for (let i = 0; i < columnMetadata.length; i++) {
      const { col, key } = columnMetadata[i];
      if (col.type === 'device') {
        if (col.prop === 'name') deviceData[key] = deviceData.name;
        else if (col.prop === 'area') deviceData[key] = deviceData.area;
        else if (col.prop === 'integration') deviceData[key] = deviceData.integration;
        else if (col.prop === 'manufacturer') deviceData[key] = deviceData.manufacturer;
        else deviceData[key] = (device as any)?.[col.prop as string] || '-';
      } else if (col.type === 'entity') {
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
      } else if (col.type === 'meta') {
        if (col.prop === 'last_changed') {
          deviceData[key] = lastChanged !== null ? lastChanged : '-';
        }
      }
    }

    result.push(deviceData);
  }

  return result;
}
