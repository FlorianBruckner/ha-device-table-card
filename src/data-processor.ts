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
  const deviceLookup = Object.fromEntries(devices.map((d) => [d.id, d]));
  const areaLookup = Object.fromEntries(areas.map((a) => [a.area_id, a]));

  const deviceMap: Record<string, any[]> = {};

  // Group entities by device using registries first
  entities.forEach((entityRegistry) => {
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
  });

  const result: DeviceData[] = [];

  Object.keys(deviceMap).forEach((deviceId) => {
    const deviceEntities = deviceMap[deviceId];
    const device = deviceLookup[deviceId];
    const deviceAreaId = device?.area_id;
    const area = deviceAreaId ? areaLookup[deviceAreaId]?.name || deviceAreaId : 'No Area';
    const integration = device?.manufacturer || device?.model || 'Unknown';

    // Apply Area Filter
    if (config?.filter?.area && area !== config.filter.area) {
      return;
    }

    // Apply Integration Filter
    if (config?.filter?.integration && integration !== config.filter.integration) {
      return;
    }

    // Apply Anchor Entity Filter
    if (config?.filter?.anchor_entity_class) {
      const hasAnchor = deviceEntities.some((e) => {
        return e.state.attributes.device_class === config?.filter?.anchor_entity_class;
      });
      if (!hasAnchor) {
        return;
      }
    }

    const deviceData: DeviceData = {
      id: deviceId,
      name: device?.name_by_user || device?.name || 'Unknown Device',
      area: area,
      integration: integration,
      _entities: {},
    };

    // Resolve Columns
    config?.columns?.forEach((col, index) => {
      const key = `col_${index}`;
      if (col.type === 'device') {
        if (col.prop === 'name') deviceData[key] = deviceData.name;
        else if (col.prop === 'area') deviceData[key] = deviceData.area;
        else if (col.prop === 'integration') deviceData[key] = deviceData.integration;
        else deviceData[key] = (device as any)?.[col.prop as string] || '-';
      } else if (col.type === 'entity') {
        const found = deviceEntities.find((e) => {
          if (col.device_class) {
            return e.state.attributes.device_class === col.device_class;
          }
          if (col.suffix) {
            return e.entity_id.endsWith(col.suffix);
          }
          return false;
        });

        if (found) {
          deviceData[key] = found.state.state;
          deviceData._entities[key] = found.state;
        } else {
          deviceData[key] = '-';
        }
      } else if (col.type === 'meta') {
        if (col.prop === 'last_changed') {
          const updates = deviceEntities
            .map((e) => new Date(e.state.last_updated).getTime())
            .filter((t) => !isNaN(t));

          if (updates.length > 0) {
            deviceData[key] = Math.max(...updates);
          } else {
            deviceData[key] = '-';
          }
        }
      }
    });

    result.push(deviceData);
  });

  return result;
}
